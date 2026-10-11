from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    wallet_balance = Column(Float, default=0.0)
    winning_balance = Column(Float, default=0.0)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    map_name = Column(String, nullable=False)
    mode = Column(String, nullable=False)
    max_slots = Column(Integer, nullable=False)
    entry_fee = Column(Float, nullable=False)
    prize_pool = Column(String, nullable=False)
    reward_details = Column(String)
    match_date = Column(String)
    match_time = Column(String)
    duration_minutes = Column(Integer)
    match_end_time = Column(String)
    banner_url = Column(String)

class RechargeRequestModel(Base):
    __tablename__ = "recharge_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_phone = Column(String, index=True)
    amount = Column(Float, nullable=False)
    utr_number = Column(String, unique=True, index=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

class WithdrawalRequestModel(Base):
    __tablename__ = "withdrawal_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_phone = Column(String, index=True)
    points = Column(Float, nullable=False)
    upi_id = Column(String, nullable=False)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

class MatchSettlement(Base):
    __tablename__ = "match_settlements"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(String, unique=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"))
    settled_at = Column(DateTime, default=datetime.utcnow)

class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float, nullable=False)
    transaction_type = Column(String, nullable=False)
    reference_id = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)