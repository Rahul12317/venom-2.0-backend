from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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
            "room_password": t.room_password 
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
        
    # 🌟 SLOT CAPACITY CHECK
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