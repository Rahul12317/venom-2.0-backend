from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
from sqlalchemy import create_engine, Column, String, DateTime, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Neon PostgreSQL Cloud Database URL with connection pool settings
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://neondb_owner:npg_UrSzw6vY3MDI@ep-dawn-wave-b49ja48y-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"

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
    balance = Column(Integer, default=20) # Total points (bonus + winnings)
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

# Create tables in DB
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Venom eSports Backend with PostgreSQL & Wallet")

# --- CORS MIDDLEWARE CONFIGURATION ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PYDANTIC SCHEMAS ---

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

ADMIN_MASTER_OTP = "242008"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Venom eSports PostgreSQL Backend is running on Neon Cloud!"}

# --- AUTHENTICATION ---

@app.post("/api/login")
def login_user(data: LoginRequest, db: Session = Depends(get_db)):
    if len(data.phone) != 10:
        raise HTTPException(status_code=400, detail="Invalid phone number length")
    
    otp = str(random.randint(100000, 999999))
    
    db.query(OTPModel).filter(OTPModel.phone == data.phone).delete()
    db.commit()
    
    new_otp = OTPModel(
        phone=data.phone, 
        otp=otp, 
        created_at=datetime.utcnow()
    )
    db.add(new_otp)
    db.commit()
    
    return {
        "success": True, 
        "message": "OTP generated successfully!", 
        "phone": data.phone, 
        "otp": otp
    }

@app.post("/api/verify-otp")
def verify_otp(data: VerifyRequest, db: Session = Depends(get_db)):
    record = db.query(OTPModel).filter(OTPModel.phone == data.phone).order_by(OTPModel.created_at.desc()).first()
    
    if not record or record.otp != data.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")
    
    expiry_time = record.created_at + timedelta(minutes=2)
    if datetime.utcnow() > expiry_time:
        db.delete(record)
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired! Please request a new OTP.")

    db.delete(record)
    
    wallet = db.query(UserWalletModel).filter(UserWalletModel.phone == data.phone).first()
    if not wallet:
        initial_bonus = 5000 if data.phone == "9170980044" else 20
        wallet = UserWalletModel(
            phone=data.phone, 
            bonus=initial_bonus, 
            winnings=0, 
            withdrawn=0,
            balance=initial_bonus
        )
        db.add(wallet)
        
        tx = WalletTransactionModel(
            phone=data.phone,
            amount=initial_bonus,
            transaction_type="CREDIT",
            description="Signup Welcome Bonus"
        )
        db.add(tx)

    db.commit()
    return {"success": True, "message": "OTP verified successfully! Login complete."}

@app.post("/api/admin/verify")
def verify_admin(data: AdminVerifyRequest, db: Session = Depends(get_db)):
    admin_record = db.query(AdminModel).filter(AdminModel.phone == data.phone).first()
    if not admin_record or data.otp != ADMIN_MASTER_OTP:
        raise HTTPException(status_code=403, detail="Access Denied: Unauthorized admin or invalid OTP.")
    return {"success": True, "message": "Admin login successful!"}


# --- TOURNAMENTS & JOINING ---

@app.post("/api/admin/tournament/create")
def create_tournament(data: TournamentCreate, phone: str = Header(...), db: Session = Depends(get_db)):
    admin_record = db.query(AdminModel).filter(AdminModel.phone == phone).first()
    if not admin_record:
        raise HTTPException(status_code=403, detail="Access Denied.")
    
    new_match = TournamentModel(**data.dict())
    db.add(new_match)
    db.commit()
    return {"success": True, "message": "Tournament created successfully!"}

@app.put("/api/admin/tournament/edit/{tournament_id}")
def edit_tournament(tournament_id: str, data: TournamentUpdate, phone: str = Header(...), db: Session = Depends(get_db)):
    admin_record = db.query(AdminModel).filter(AdminModel.phone == phone).first()
    if not admin_record:
        raise HTTPException(status_code=403, detail="Access Denied.")
    
    match = db.query(TournamentModel).filter(TournamentModel.id == tournament_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    for key, value in data.dict().items():
        setattr(match, key, value)
    
    db.commit()
    return {"success": True, "message": "Tournament updated successfully!"}

@app.get("/api/tournaments")
def get_tournaments(db: Session = Depends(get_db)):
    tournaments = db.query(TournamentModel).filter(TournamentModel.status != "Completed").all()
    
    formatted_tournaments = []
    for t in tournaments:
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
        wallet = UserWalletModel(
            phone=phone, 
            bonus=initial_bonus, 
            winnings=0, 
            withdrawn=0,
            balance=initial_bonus
        )
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        
    tournament = db.query(TournamentModel).filter(TournamentModel.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found.")
        
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
    
    tournament.filled_slots = (tournament.filled_slots or 0) + 1
    
    tx = WalletTransactionModel(
        phone=phone,
        amount=entry_fee,
        transaction_type="DEBIT",
        description=f"Joined Tournament: {tournament.title}"
    )
    db.add(tx)
    
    db.commit()
    return {"success": True, "message": "Successfully joined tournament with your team!"}


# --- RESULTS & SMART AUTOMATIC REWARD DISTRIBUTION ---

@app.post("/api/admin/tournament/result/{tournament_id}")
def upload_result(tournament_id: str, data: ResultCreate, phone: str = Header(...), db: Session = Depends(get_db)):
    admin_record = db.query(AdminModel).filter(AdminModel.phone == phone).first()
    if not admin_record:
        raise HTTPException(status_code=403, detail="Access Denied.")
    
    match = db.query(TournamentModel).filter(TournamentModel.id == tournament_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    participant = db.query(TournamentJoinModel).filter(
        TournamentJoinModel.tournament_id == tournament_id,
        TournamentJoinModel.in_game_name == data.in_game_name
    ).first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Player not found in this tournament participants list.")
    
    user_phone = participant.phone
    
    new_result = TournamentResultModel(
        tournament_id=tournament_id,
        in_game_name=data.in_game_name,
        uid=data.uid,
        reward_points=str(data.reward_points),
        declared_at=datetime.utcnow()
    )
    db.add(new_result)
    
    match.status = "Completed"
    
    wallet = db.query(UserWalletModel).filter(UserWalletModel.phone == user_phone).first()
    if not wallet:
        initial_bonus = 5000 if user_phone == "9170980044" else 20
        wallet = UserWalletModel(phone=user_phone, bonus=initial_bonus, winnings=0, withdrawn=0, balance=initial_bonus)
        db.add(wallet)
    
    wallet.winnings = (wallet.winnings or 0) + data.reward_points
    wallet.balance = (wallet.bonus or 0) + (wallet.winnings or 0)
    
    tx = WalletTransactionModel(
        phone=user_phone,
        amount=data.reward_points,
        transaction_type="CREDIT",
        description=f"Tournament Winning Reward: {match.title}"
    )
    db.add(tx)
    db.commit()
    
    return {"success": True, "message": f"Result saved & {data.reward_points} points automatically credited to Winnings! Tournament marked as completed."}

@app.get("/api/tournaments/results/{tournament_id}")
def get_tournament_results(tournament_id: str, phone: str = Header(...), db: Session = Depends(get_db)):
    participant = db.query(TournamentJoinModel).filter(
        TournamentJoinModel.tournament_id == tournament_id,
        TournamentJoinModel.phone == phone
    ).first()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Access Denied: You must be registered in this tournament to view results.")
    
    results = db.query(TournamentResultModel).filter(TournamentResultModel.tournament_id == tournament_id).all()
    if not results:
        return {"success": True, "message": "Results not announced yet.", "winners": []}
    
    latest_result = results[0]
    if latest_result.declared_at:
        if datetime.utcnow() - latest_result.declared_at > timedelta(hours=10):
            return {"success": True, "message": "Results expired after 10 hours.", "winners": []}
    
    sorted_results = sorted(results, key=lambda x: int(x.reward_points), reverse=True)
    
    winners_list = [
        {
            "in_game_name": res.in_game_name, 
            "uid": res.uid,                  
            "reward_points": res.reward_points
        } 
        for res in sorted_results
    ]
    return {"success": True, "tournament_id": tournament_id, "winners": winners_list}


# --- WALLET, RECHARGE & WITHDRAWAL ---

@app.get("/api/wallet/balance")
def get_wallet_balance(phone: str = Header(...), db: Session = Depends(get_db)):
    wallet = db.query(UserWalletModel).filter(UserWalletModel.phone == phone).first()
    if not wallet:
        initial_bonus = 5000 if phone == "9170980044" else 20
        wallet = UserWalletModel(
            phone=phone, 
            bonus=initial_bonus, 
            winnings=0, 
            withdrawn=0,
            balance=initial_bonus
        )
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    
    total_pts = (wallet.bonus or 0) + (wallet.winnings or 0)
    return {
        "success": True,
        "phone": phone,
        "total_pts": total_pts,
        "winnings": wallet.winnings or 0,
        "bonus": wallet.bonus or 0,
        "withdrawn": wallet.withdrawn or 0
    }

@app.post("/api/wallet/recharge/submit")
def submit_recharge(data: RechargeSubmit, phone: str = Header(...), db: Session = Depends(get_db)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid recharge amount.")
    
    existing_utr = db.query(RechargeRequestModel).filter(RechargeRequestModel.utr_number == data.utr_number).first()
    if existing_utr:
        raise HTTPException(status_code=400, detail="This UTR number has already been submitted.")
    
    recharge = RechargeRequestModel(phone=phone, amount=data.amount, utr_number=data.utr_number, status="Pending")
    db.add(recharge)
    db.commit()
    return {"success": True, "message": "Recharge request submitted successfully. Waiting for admin."}

@app.get("/api/admin/recharge/pending")
def get_pending_recharges(phone: str = Header(...), db: Session = Depends(get_db)):
    admin = db.query(AdminModel).filter(AdminModel.phone == phone).first()
    if not admin:
        raise HTTPException(status_code=403, detail="Access Denied.")
    
    requests = db.query(RechargeRequestModel).filter(RechargeRequestModel.status == "Pending").all()
    return {"success": True, "pending_recharges": requests}

@app.post("/api/admin/recharge/approve")
def approve_recharge(data: ActionRequest, phone: str = Header(...), db: Session = Depends(get_db)):
    admin = db.query(AdminModel).filter(AdminModel.phone == phone).first()
    if not admin:
        raise HTTPException(status_code=403, detail="Access Denied.")
    
    recharge = db.query(RechargeRequestModel).filter(RechargeRequestModel.id == data.request_id).first()
    if not recharge or recharge.status != "Pending":
        raise HTTPException(status_code=404, detail="Pending request not found.")
    
    wallet = db.query(UserWalletModel).filter(UserWalletModel.phone == recharge.phone).first()
    if not wallet:
        initial_bonus = 5000 if recharge.phone == "9170980044" else 20
        wallet = UserWalletModel(phone=recharge.phone, bonus=initial_bonus, winnings=0, withdrawn=0, balance=initial_bonus)
        db.add(wallet)
    
    wallet.bonus = (wallet.bonus or 0) + recharge.amount
    wallet.balance = (wallet.bonus or 0) + (wallet.winnings or 0)
    recharge.status = "Approved"
    
    tx = WalletTransactionModel(
        phone=recharge.phone,
        amount=recharge.amount,
        transaction_type="CREDIT",
        description=f"Recharge Approved (UTR: {recharge.utr_number})"
    )
    db.add(tx)
    db.commit()
    return {"success": True, "message": f"Recharge approved! {recharge.amount} bonus points added."}

@app.post("/api/wallet/withdraw/submit")
def submit_withdrawal(data: WithdrawalSubmit, phone: str = Header(...), db: Session = Depends(get_db)):
    if data.amount < 50:
        raise HTTPException(status_code=400, detail="Minimum withdrawal amount is 50 points.")
    
    wallet = db.query(UserWalletModel).filter(UserWalletModel.phone == phone).first()
    if not wallet or wallet.winnings < data.amount:
        raise HTTPException(status_code=400, detail="Not sufficient winnings coins in wallet to withdraw!")
    
    withdrawal = WithdrawalRequestModel(phone=phone, amount=data.amount, upi_id=data.upi_id, status="Pending")
    db.add(withdrawal)
    db.commit()
    return {"success": True, "message": "Withdrawal request submitted successfully!"}

@app.get("/api/admin/withdrawal/pending")
def get_pending_withdrawals(phone: str = Header(...), db: Session = Depends(get_db)):
    admin = db.query(AdminModel).filter(AdminModel.phone == phone).first()
    if not admin:
        raise HTTPException(status_code=403, detail="Access Denied.")
    
    requests = db.query(WithdrawalRequestModel).filter(WithdrawalRequestModel.status == "Pending").all()
    return {"success": True, "pending_withdrawals": requests}

@app.post("/api/admin/withdrawal/approve")
def approve_withdrawal(data: ActionRequest, phone: str = Header(...), db: Session = Depends(get_db)):
    admin = db.query(AdminModel).filter(AdminModel.phone == phone).first()
    if not admin:
        raise HTTPException(status_code=403, detail="Access Denied.")
    
    withdrawal = db.query(WithdrawalRequestModel).filter(WithdrawalRequestModel.id == data.request_id).first()
    if not withdrawal or withdrawal.status != "Pending":
        raise HTTPException(status_code=404, detail="Pending request not found.")
    
    wallet = db.query(UserWalletModel).filter(UserWalletModel.phone == withdrawal.phone).first()
    if not wallet or wallet.winnings < withdrawal.amount:
        raise HTTPException(status_code=400, detail="User does not have enough winnings balance!")
    
    wallet.winnings -= withdrawal.amount
    wallet.balance = (wallet.bonus or 0) + (wallet.winnings or 0)
    wallet.withdrawn += withdrawal.amount
    withdrawal.status = "Approved"
    
    tx = WalletTransactionModel(
        phone=withdrawal.phone,
        amount=withdrawal.amount,
        transaction_type="DEBIT",
        description=f"Withdrawal Approved to UPI: {withdrawal.upi_id}"
    )
    db.add(tx)
    db.commit()
    return {"success": True, "message": "Withdrawal approved and finalized!"}


# --- USER HISTORY ENDPOINTS ---

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
            
    return {
        "success": True,
        "phone": phone,
        "joined_tournaments": match_history
    }

@app.get("/api/user/transactions")
def get_user_transactions(phone: str = Header(...), db: Session = Depends(get_db)):
    transactions = db.query(WalletTransactionModel).filter(WalletTransactionModel.phone == phone).order_by(WalletTransactionModel.created_at.desc()).all()
    
    tx_list = []
    for tx in transactions:
        tx_list.append({
            "amount": tx.amount,
            "type": tx.transaction_type,
            "description": tx.description,
            "date": tx.created_at
        })
        
    return {
        "success": True,
        "phone": phone,
        "transactions": tx_list
    }

@app.get("/api/tournaments/{tournament_id}/players")
def get_tournament_players(tournament_id: str, db: Session = Depends(get_db)):
    registrations = db.query(TournamentJoinModel).filter(TournamentJoinModel.tournament_id == tournament_id).all()
    players = [{"ign": reg.in_game_name, "uid": reg.uid} for reg in registrations]
    return {"success": True, "players": players}


@app.get("/api/admin/tournament/{tournament_id}/players")
def get_tournament_registered_players(tournament_id: str, phone: str = Header(...), db: Session = Depends(get_db)):
    registrations = db.query(TournamentJoinModel).filter(TournamentJoinModel.tournament_id == tournament_id).all()
    players = [{"ign": reg.in_game_name, "uid": reg.uid} for reg in registrations]
    return {"success": True, "players": players}

class RoomCredentialsUpdate(BaseModel):
    room_id: str
    room_password: str

@app.post("/api/admin/tournament/room/{tournament_id}")
def update_room_credentials(tournament_id: str, data: RoomCredentialsUpdate, phone: str = Header(...), db: Session = Depends(get_db)):
    admin_record = db.query(AdminModel).filter(AdminModel.phone == phone).first()
    if not admin_record:
        raise HTTPException(status_code=403, detail="Access Denied.")
    
    tournament = db.query(TournamentModel).filter(TournamentModel.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found.")
    
    tournament.room_id = data.room_id
    tournament.room_password = data.room_password
    db.commit()
    
    return {"success": True, "message": "Room credentials published successfully!"}

@app.get("/api/tournament/room/{tournament_id}")
def get_tournament_room_credentials(tournament_id: str, phone: str = Header(...), db: Session = Depends(get_db)):
    participant = db.query(TournamentJoinModel).filter(
        TournamentJoinModel.tournament_id == tournament_id,
        TournamentJoinModel.phone == phone
    ).first()
    
    if not participant:
        raise HTTPException(status_code=403, detail="You have not joined this tournament. Room details locked.")
    
    tournament = db.query(TournamentModel).filter(TournamentModel.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found.")
        
    return {
        "success": True,
        "room_id": tournament.room_id or "Not Announced Yet",
        "room_password": tournament.room_password or "Not Announced Yet"
    }