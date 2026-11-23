from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    wallet_balance = Column(Float, default=20.0, nullable=False)
    winning_balance = Column(Float, default=0.0, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SignupBonusClaimModel(Base):
    __tablename__ = "signup_bonus_claims"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    bonus_amount = Column(Integer, default=20, nullable=False)
    claimed_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AccountDeletionRequestModel(Base):
    __tablename__ = "account_deletion_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone = Column(String, index=True, nullable=False)
    reason = Column(String, nullable=True)
    status = Column(String, default="Pending", nullable=False)  # Pending / Completed
    requested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)


class OTPModel(Base):
    __tablename__ = "otps"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone = Column(String, index=True, nullable=False)
    otp = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


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
    filled_slots = Column(Integer, default=0, nullable=False)
    reward_info = Column(String, nullable=False)
    status = Column(String, default="Upcoming", nullable=False)

    # Room credentials for custom matches
    room_id = Column(String, nullable=True)
    room_password = Column(String, nullable=True)

    # Optional banner styling
    bg_image = Column(String, nullable=True)
    bg_brightness = Column(Integer, default=50, nullable=True)


class TournamentJoinModel(Base):
    __tablename__ = "tournament_participants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tournament_id = Column(String, ForeignKey("tournaments.id"), index=True, nullable=False)
    phone = Column(String, index=True, nullable=False)
    team_name = Column(String, nullable=True)
    in_game_name = Column(String, nullable=False)
    uid = Column(String, nullable=False)


class TournamentResultModel(Base):
    __tablename__ = "tournament_results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tournament_id = Column(String, ForeignKey("tournaments.id"), index=True, nullable=False)
    in_game_name = Column(String, nullable=False)
    uid = Column(String, nullable=False)
    reward_points = Column(String, nullable=False)
    declared_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class UserWalletModel(Base):
    __tablename__ = "user_wallets"

    phone = Column(String, primary_key=True, index=True)
    bonus = Column(Integer, default=20, nullable=False)
    winnings = Column(Integer, default=0, nullable=False)
    withdrawn = Column(Integer, default=0, nullable=False)
    balance = Column(Integer, default=20, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class WalletTransactionModel(Base):
    __tablename__ = "wallet_transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone = Column(String, index=True, nullable=False)
    amount = Column(Integer, nullable=False)
    transaction_type = Column(String, nullable=False)  # CREDIT / DEBIT
    description = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class RechargeRequestModel(Base):
    __tablename__ = "recharge_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone = Column(String, index=True, nullable=False)
    amount = Column(Integer, nullable=False)
    utr_number = Column(String, unique=True, nullable=False)
    status = Column(String, default="Pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class WithdrawalRequestModel(Base):
    __tablename__ = "withdrawal_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone = Column(String, index=True, nullable=False)
    amount = Column(Integer, nullable=False)
    upi_id = Column(String, nullable=False)
    status = Column(String, default="Pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class MatchSettlement(Base):
    __tablename__ = "match_settlements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    match_id = Column(String, unique=True, index=True, nullable=False)
    admin_phone = Column(String, nullable=True)
    settled_at = Column(DateTime, default=datetime.utcnow, nullable=False)