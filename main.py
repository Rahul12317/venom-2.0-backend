from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import random
import httpx
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, String, DateTime, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# --- LOAD ENVIRONMENT VARIABLES ---
load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
WHATSAPP_BOT_URL = os.getenv("WHATSAPP_BOT_URL")
ADMIN_MASTER_OTP = os.getenv("ADMIN_MASTER_OTP", "242008")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- DATABASE MODELS ---

class OTPModel(Base):
    __tablename__ = "otps"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone = Column(String, index=True, nullable=False)
    otp = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AdminModel(Base):
    __tablename__ = "admins"
    phone = Column(String, primary_key=True, index=True)

class TournamentModel(Base):
    __tablename__ = "tournaments"
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    map_name = Column(String, nullable=False)
    match_type = Column(String, nullable=False)
    prize_pool = Column(String, nullable=False)
    date_time = Column(String, nullable=False)
    start_time = Column(String, nullable=True)    
    end_time = Column(String, nullable=True)      
    entry_fee = Column(String, nullable=False)
    total_slots = Column(Integer, nullable=False)
    filled_slots = Column(Integer, default=0)
    reward_info = Column(String, nullable=False)
    status = Column(String, default="Upcoming")    

    room_id = Column(String, nullable=True)
    room_password = Column(String, nullable=True)
    
    # 🌟 Background Image & Brightness Columns added
    bg_image = Column(String, nullable=True)
    bg_brightness = Column(Integer, default=50, nullable=True)

class TournamentJoinModel(Base):
    __tablename__ = "tournament_participants"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tournament_id = Column(String, index=True, nullable=False)
    phone = Column(String, nullable=False)
    team_name = Column(String, nullable=True)
    in_game_name = Column(String, nullable=False)
    uid = Column(String, nullable=False)

class TournamentResultModel(Base):
    __tablename__ = "tournament_results"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tournament_id = Column(String, index=True, nullable=False)
    in_game_name = Column(String, nullable=False)
    uid = Column(String, nullable=False)
    reward_points = Column(String, nullable=False)
    declared_at = Column(DateTime, default=datetime.utcnow) 

class UserWalletModel(Base):
    __tablename__ = "user_wallets"
    phone = Column(String, primary_key=True, index=True)
    bonus = Column(Integer, default=20)
    winnings = Column(Integer, default=0)
    withdrawn = Column(Integer, default=0)
    balance = Column(Integer, default=20)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WalletTransactionModel(Base):
    __tablename__ = "wallet_transactions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone = Column(String, index=True, nullable=False)
    amount = Column(Integer, nullable=False)
    transaction_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class RechargeRequestModel(Base):
    __tablename__ = "recharge_requests"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone = Column(String, index=True, nullable=False)
    amount = Column(Integer, nullable=False)
    utr_number = Column(String, unique=True, nullable=False)
    status = Column(String, default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)

class WithdrawalRequestModel(Base):
    __tablename__ = "withdrawal_requests"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone = Column(String, index=True, nullable=False)
    amount = Column(Integer, nullable=False)
    upi_id = Column(String, nullable=False)
    status = Column(String, default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Venom eSports Backend with PostgreSQL & Wallet")

origins = [
    "https://venom-esports.vercel.app"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def trigger_whatsapp_otp(phone: str, otp: str):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                WHATSAPP_BOT_URL, 
                json={"phone": phone, "otp": otp}
            )
            return response.json()
        except Exception as e:
            print(f"WhatsApp OTP error: {e}")
            return {"success": False, "error": str(e)}

class LoginRequest(BaseModel):
    phone: str

class VerifyRequest(BaseModel):
    phone: str
    otp: str

class AdminVerifyRequest(BaseModel):
    phone: str
    otp: str

# 🌟 Pydantic Model updated to receive bg_image and bg_brightness
class TournamentCreate(BaseModel):
    id: str
    title: str
    map_name: str
    match_type: str
    prize_pool: str
    date_time: str
    start_time: str = "00:00"
    end_time: str = "00:30"
    entry_fee: str
    total_slots: int
    reward_info: str
    status: str = "Upcoming"
    bg_image: Optional[str] = None
    bg_brightness: Optional[int] = 50

# 🌟 Pydantic Model updated for Tournament Edit
class TournamentUpdate(BaseModel):
    title: str
    map_name: str
    match_type: str
    prize_pool: str
    date_time: str
    start_time: str = "00:00"
    end_time: str = "00:30"
    entry_fee: str
    total_slots: int
    reward_info: str
    status: str
    bg_image: Optional[str] = None
    bg_brightness: Optional[int] = 50

class JoinTournamentRequest(BaseModel):
    phone: str
    team_name: str = "Solo Player"
    in_game_name: str
    uid: str

class ResultCreate(BaseModel):
    in_game_name: str
    uid: str
    reward_points: int

class RechargeSubmit(BaseModel):
    amount: int
    utr_number: str

class WithdrawalSubmit(BaseModel):
    amount: int
    upi_id: str

class ActionRequest(BaseModel):
    request_id: int

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.api_route("/ping", methods=["GET", "HEAD"])
def ping_server():
    return {"status": "alive"}

@app.post("/api/login")
async def login_user(data: LoginRequest, db: Session = Depends(get_db)):
    if len(data.phone) != 10:
        raise HTTPException(status_code=400, detail="Invalid phone number length")
    
    otp = str(random.randint(100000, 999999))
    db.query(OTPModel).filter(OTPModel.phone == data.phone).delete()
    db.commit()
    
    new_otp = OTPModel(phone=data.phone, otp=otp, created_at=datetime.utcnow())
    db.add(new_otp)
    db.commit()
    
    await trigger_whatsapp_otp(data.phone, otp)
    return {"success": True, "message": "OTP generated successfully!", "phone": data.phone, "otp": otp}

@app.post("/api/verify-otp")
def verify_otp(data: VerifyRequest, db: Session = Depends(get_db)):
    record = db.query(OTPModel).filter(OTPModel.phone == data.phone).order_by(OTPModel.created_at.desc()).first()
    if not record or record.otp != data.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP.")
    
    db.delete(record)
    wallet = db.query(UserWalletModel).filter(UserWalletModel.phone == data.phone).first()
    if not wallet:
        initial_bonus = 5000 if data.phone == "9170980044" else 20
        wallet = UserWalletModel(phone=data.phone, bonus=initial_bonus, winnings=0, withdrawn=0, balance=initial_bonus)
        db.add(wallet)
        tx = WalletTransactionModel(phone=data.phone, amount=initial_bonus, transaction_type="CREDIT", description="Signup Welcome Bonus")
        db.add(tx)
    db.commit()
    return {"success": True, "message": "OTP verified successfully!"}

@app.post("/api/admin/verify")
def verify_admin(data: AdminVerifyRequest, db: Session = Depends(get_db)):
    admin_record = db.query(AdminModel).filter(AdminModel.phone == data.phone).first()
    if not admin_record or data.otp != ADMIN_MASTER_OTP:
        raise HTTPException(status_code=403, detail="Access Denied.")
    return {"success": True, "message": "Admin login successful!"}

@app.get("/api/tournaments")
def get_tournaments(db: Session = Depends(get_db)):
    tournaments = db.query(TournamentModel).filter(TournamentModel.status != "Completed").all()
    formatted_tournaments = []
    for t in tournaments:
        actual_joined = db.query(TournamentJoinModel).filter(TournamentJoinModel.tournament_id == t.id).count()
        formatted_tournaments.append({
            "id": t.id,
            "title": t.title,
            "map": t.map_name,
            "mode": t.match_type,
            "pool": t.prize_pool,
            "matchTime": t.date_time,
            "startTime": t.start_time,
            "endTime": t.end_time,
            "entryFee": t.entry_fee,
            "slots": t.total_slots,
            "filled_slots": actual_joined,
            "reward": t.reward_info,
            "status": t.status,
            "room_id": t.room_id,          
            "room_password": t.room_password,
            "bg_image": t.bg_image,            # 🌟 Sent to frontend
            "bg_brightness": t.bg_brightness   # 🌟 Sent to frontend
        })
    return {"success": True, "tournaments": formatted_tournaments}

@app.post("/api/tournament/join/{tournament_id}")
def join_tournament(tournament_id: str, data: JoinTournamentRequest, phone: str = Header(...), db: Session = Depends(get_db)):
    wallet = db.query(UserWalletModel).filter(UserWalletModel.phone == phone).first()
    if not wallet:
        initial_bonus = 5000 if phone == "9170980044" else 20
        wallet = UserWalletModel(phone=phone, bonus=initial_bonus, winnings=0, withdrawn=0, balance=initial_bonus)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        
    tournament = db.query(TournamentModel).filter(TournamentModel.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found.")
        
    current_joined_count = db.query(TournamentJoinModel).filter(TournamentJoinModel.tournament_id == tournament_id).count()
    if current_joined_count >= tournament.total_slots:
        raise HTTPException(status_code=400, detail="Slots are fully booked!")

    entry_fee = int(str(tournament.entry_fee).replace("Pts", "").replace("INR", "").strip() or 0)
    total_available = (wallet.bonus or 0) + (wallet.winnings or 0)
    if total_available < entry_fee:
        raise HTTPException(status_code=400, detail="Insufficient balance for entry fee.")
        
    existing = db.query(TournamentJoinModel).filter(
        TournamentJoinModel.tournament_id == tournament_id,
        TournamentJoinModel.phone == phone
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already joined this tournament.")

    fee_remaining = entry_fee
    if (wallet.bonus or 0) >= fee_remaining:
        wallet.bonus -= fee_remaining
        fee_remaining = 0
    else:
        fee_remaining -= (wallet.bonus or 0)
        wallet.bonus = 0
        wallet.winnings -= fee_remaining

    wallet.balance = (wallet.bonus or 0) + (wallet.winnings or 0)
    team_name = data.team_name if tournament.match_type.lower() != 'solo' else 'Solo Player'
    
    participant = TournamentJoinModel(
        tournament_id=tournament_id,
        phone=phone,
        team_name=team_name,
        in_game_name=data.in_game_name,
        uid=data.uid
    )
    db.add(participant)
    tournament.filled_slots = current_joined_count + 1
    
    tx = WalletTransactionModel(
        phone=phone,
        amount=entry_fee,
        transaction_type="DEBIT",
        description=f"Joined Tournament: {tournament.title}"
    )
    db.add(tx)
    db.commit()
    return {"success": True, "message": "Successfully joined tournament!"}

@app.get("/api/wallet/balance")
def get_wallet_balance(phone: str = Header(...), db: Session = Depends(get_db)):
    wallet = db.query(UserWalletModel).filter(UserWalletModel.phone == phone).first()
    if not wallet:
        initial_bonus = 5000 if phone == "9170980044" else 20
        wallet = UserWalletModel(phone=phone, bonus=initial_bonus, winnings=0, withdrawn=0, balance=initial_bonus)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    total_pts = (wallet.bonus or 0) + (wallet.winnings or 0)
    return {"success": True, "phone": phone, "total_pts": total_pts, "winnings": wallet.winnings or 0, "bonus": wallet.bonus or 0, "withdrawn": wallet.withdrawn or 0}

@app.get("/api/user/matches")
def get_user_matches(phone: str = Header(...), db: Session = Depends(get_db)):
    participations = db.query(TournamentJoinModel).filter(TournamentJoinModel.phone == phone).all()
    match_history = []
    for p in participations:
        match = db.query(TournamentModel).filter(TournamentModel.id == p.tournament_id).first()
        if match:
            match_history.append({
                "tournament_id": match.id,
                "title": match.title,
                "map_name": match.map_name,
                "match_type": match.match_type,
                "entry_fee": match.entry_fee,
                "status": match.status,
                "team_name": p.team_name,
                "in_game_name": p.in_game_name,
                "uid": p.uid,
                "room_id": match.room_id,          
                "room_password": match.room_password 
            })
    return {"success": True, "phone": phone, "joined_tournaments": match_history}

@app.get("/api/user/transactions")
def get_user_transactions(phone: str = Header(...), db: Session = Depends(get_db)):
    transactions = db.query(WalletTransactionModel).filter(WalletTransactionModel.phone == phone).order_by(WalletTransactionModel.created_at.desc()).all()
    tx_list = [{"amount": tx.amount, "type": tx.transaction_type, "description": tx.description, "date": tx.created_at} for tx in transactions]
    return {"success": True, "phone": phone, "transactions": tx_list}

@app.post("/api/wallet/recharge/submit")
def submit_recharge(data: RechargeSubmit, phone: str = Header(...), db: Session = Depends(get_db)):
    existing = db.query(RechargeRequestModel).filter(RechargeRequestModel.utr_number == data.utr_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="This UTR number has already been submitted.")
    
    req = RechargeRequestModel(phone=phone, amount=data.amount, utr_number=data.utr_number, status="Pending")
    db.add(req)
    db.commit()
    return {"success": True, "message": "Recharge request submitted successfully!"}

@app.post("/api/wallet/withdraw/submit")
def submit_withdrawal(data: WithdrawalSubmit, phone: str = Header(...), db: Session = Depends(get_db)):
    wallet = db.query(UserWalletModel).filter(UserWalletModel.phone == phone).first()
    if not wallet or (wallet.winnings or 0) < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient winnings balance.")
    
    req = WithdrawalRequestModel(phone=phone, amount=data.amount, upi_id=data.upi_id, status="Pending")
    db.add(req)
    db.commit()
    return {"success": True, "message": "Withdrawal request submitted successfully!"}

@app.get("/api/admin/recharge/pending")
def get_pending_recharges(phone: str = Header(...), db: Session = Depends(get_db)):
    if phone != "9170980044":
        raise HTTPException(status_code=403, detail="Unauthorized.")
    recharges = db.query(RechargeRequestModel).filter(RechargeRequestModel.status == "Pending").all()
    list_r = [{"id": r.id, "phone": r.phone, "amount": r.amount, "utr_number": r.utr_number} for r in recharges]
    return {"success": True, "pending_recharges": list_r}

@app.post("/api/admin/recharge/approve")
def approve_recharge(data: ActionRequest, phone: str = Header(...), db: Session = Depends(get_db)):
    if phone != "9170980044":
        raise HTTPException(status_code=403, detail="Unauthorized.")
    req = db.query(RechargeRequestModel).filter(RechargeRequestModel.id == data.request_id, RechargeRequestModel.status == "Pending").first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    
    req.status = "Approved"
    wallet = db.query(UserWalletModel).filter(UserWalletModel.phone == req.phone).first()
    if wallet:
        wallet.bonus = (wallet.bonus or 0) + req.amount
        wallet.balance = (wallet.bonus or 0) + (wallet.winnings or 0)
    
    tx = WalletTransactionModel(phone=req.phone, amount=req.amount, transaction_type="CREDIT", description=f"Recharge Approved (UTR: {req.utr_number})")
    db.add(tx)
    db.commit()
    return {"success": True, "message": "Recharge approved & points credited!"}

@app.get("/api/admin/withdrawal/pending")
def get_pending_withdrawals(phone: str = Header(...), db: Session = Depends(get_db)):
    if phone != "9170980044":
        raise HTTPException(status_code=403, detail="Unauthorized.")
    withdrawals = db.query(WithdrawalRequestModel).filter(WithdrawalRequestModel.status == "Pending").all()
    list_w = [{"id": w.id, "phone": w.phone, "amount": w.amount, "upi_id": w.upi_id} for w in withdrawals]
    return {"success": True, "pending_withdrawals": list_w}

@app.post("/api/admin/withdrawal/approve")
def approve_withdrawal(data: ActionRequest, phone: str = Header(...), db: Session = Depends(get_db)):
    if phone != "9170980044":
        raise HTTPException(status_code=403, detail="Unauthorized.")
    req = db.query(WithdrawalRequestModel).filter(WithdrawalRequestModel.id == data.request_id, WithdrawalRequestModel.status == "Pending").first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    
    req.status = "Approved"
    wallet = db.query(UserWalletModel).filter(UserWalletModel.phone == req.phone).first()
    if wallet:
        wallet.withdrawn = (wallet.withdrawn or 0) + req.amount
    
    tx = WalletTransactionModel(phone=req.phone, amount=req.amount, transaction_type="DEBIT", description=f"Withdrawal Approved (UPI: {req.upi_id})")
    db.add(tx)
    db.commit()
    return {"success": True, "message": "Withdrawal cashout approved!"}

@app.post("/api/admin/tournament/create")
def create_tournament(data: TournamentCreate, phone: str = Header(...), db: Session = Depends(get_db)):
    if phone != "9170980044":
        raise HTTPException(status_code=403, detail="Unauthorized.")
    existing = db.query(TournamentModel).filter(TournamentModel.id == data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tournament ID already exists.")
    
    # 🌟 Saving bg_image and bg_brightness into database
    t = TournamentModel(
        id=data.id,
        title=data.title,
        map_name=data.map_name,
        match_type=data.match_type,
        prize_pool=data.prize_pool,
        date_time=data.date_time,
        start_time=data.start_time,
        end_time=data.end_time,
        entry_fee=data.entry_fee,
        total_slots=data.total_slots,
        filled_slots=0,
        reward_info=data.reward_info,
        status=data.status,
        bg_image=data.bg_image,
        bg_brightness=data.bg_brightness
    )
    db.add(t)
    db.commit()
    return {"success": True, "message": "Tournament created successfully!"}

@app.put("/api/admin/tournament/edit/{tournament_id}")
def edit_tournament(tournament_id: str, data: TournamentUpdate, phone: str = Header(...), db: Session = Depends(get_db)):
    if phone != "9170980044":
        raise HTTPException(status_code=403, detail="Unauthorized.")
    t = db.query(TournamentModel).filter(TournamentModel.id == tournament_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found.")
    
    t.title = data.title
    t.map_name = data.map_name
    t.match_type = data.match_type
    t.prize_pool = data.prize_pool
    t.date_time = data.date_time
    t.start_time = data.start_time
    t.end_time = data.end_time
    t.entry_fee = data.entry_fee
    t.total_slots = data.total_slots
    t.reward_info = data.reward_info
    t.status = data.status
    t.bg_image = data.bg_image
    t.bg_brightness = data.bg_brightness
    
    db.commit()
    return {"success": True, "message": "Tournament updated successfully!"}

@app.get("/api/admin/tournament/{tournament_id}/players")
def get_tournament_players(tournament_id: str, phone: str = Header(...), db: Session = Depends(get_db)):
    if phone != "9170980044":
        raise HTTPException(status_code=403, detail="Unauthorized.")
    participants = db.query(TournamentJoinModel).filter(TournamentJoinModel.tournament_id == tournament_id).all()
    players = [{"ign": p.in_game_name, "uid": p.uid, "team_name": p.team_name, "phone": p.phone} for p in participants]
    return {"success": True, "players": players}

@app.post("/api/admin/tournament/result/{tournament_id}")
def submit_tournament_result(tournament_id: str, data: ResultCreate, phone: str = Header(...), db: Session = Depends(get_db)):
    if phone != "9170980044":
        raise HTTPException(status_code=403, detail="Unauthorized.")
    
    tournament = db.query(TournamentModel).filter(TournamentModel.id == tournament_id).first()
    if tournament:
        tournament.status = "Completed"
    
    res = TournamentResultModel(tournament_id=tournament_id, in_game_name=data.in_game_name, uid=data.uid, reward_points=str(data.reward_points))
    db.add(res)
    
    participant = db.query(TournamentJoinModel).filter(TournamentJoinModel.tournament_id == tournament_id, TournamentJoinModel.uid == data.uid).first()
    if participant:
        wallet = db.query(UserWalletModel).filter(UserWalletModel.phone == participant.phone).first()
        if wallet:
            wallet.winnings = (wallet.winnings or 0) + data.reward_points
            wallet.balance = (wallet.bonus or 0) + (wallet.winnings or 0)
            tx = WalletTransactionModel(phone=participant.phone, amount=data.reward_points, transaction_type="CREDIT", description=f"Tournament Winnings: {tournament.title if tournament else tournament_id}")
            db.add(tx)
    
    db.commit()
    return {"success": True, "message": "Result saved & winnings credited!"}

@app.post("/api/admin/tournament/room/{tournament_id}")
def publish_room_credentials(tournament_id: str, room_data: dict, phone: str = Header(...), db: Session = Depends(get_db)):
    if phone != "9170980044":
        raise HTTPException(status_code=403, detail="Unauthorized.")
    t = db.query(TournamentModel).filter(TournamentModel.id == tournament_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found.")
    
    t.room_id = room_data.get("room_id")
    t.room_password = room_data.get("room_password")
    db.commit()
    return {"success": True, "message": "Room credentials published successfully!"}

@app.get("/api/tournaments/results/{tournament_id}")
def get_tournament_results(tournament_id: str, db: Session = Depends(get_db)):
    results = db.query(TournamentResultModel).filter(TournamentResultModel.tournament_id == tournament_id).all()
    winners = [{"in_game_name": r.in_game_name, "uid": r.uid, "reward_points": r.reward_points} for r in results]
    return {"success": True, "winners": winners}