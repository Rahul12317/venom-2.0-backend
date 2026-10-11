from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)
    wallet_balance = Column(Float, default=20.0)
    winning_balance = Column(Float, default=0.0)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class OTPModel(Base):
    __tablename__ = "otps"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone = Column(String, index=True, nullable=False)
    otp = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AdminModel(Base):
    __tablename__ = "admins"

    phone = Column(String, primary_key=True, index=True)

class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    map_name = Column(String, nullable=False)
    match_type = Column(String, nullable=False)  # Solo / Duo / Squad
    prize_pool = Column(String, nullable=False)
    date_time = Column(String, nullable=False)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    entry_fee = Column(String, nullable=False)
    total_slots = Column(Integer, nullable=False)
    filled_slots = Column(Integer, default=0)
    reward_info = Column(String, nullable=False)
    status = Column(String, default="Upcoming")
    
    # Room credentials for custom matches
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
    transaction_type = Column(String, nullable=False) # CREDIT / DEBIT
    description = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class RechargeRequestModel(Base):
    __tablename__ = "recharge_requests"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, index=True, nullable=False)
    amount = Column(Integer, nullable=False)
    utr_number = Column(String, unique=True, nullable=False)
    status = Column(String, default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)

class WithdrawalRequestModel(Base):
    __tablename__ = "withdrawal_requests"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, index=True, nullable=False)
    amount = Column(Integer, nullable=False)
    upi_id = Column(String, nullable=False)
    status = Column(String, default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)

class MatchSettlement(Base):
    __tablename__ = "match_settlements"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(String, unique=True, index=True)
    admin_phone = Column(String)
    settled_at = Column(DateTime, default=datetime.utcnow)