from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, TIMESTAMP, BigInteger, Text, Numeric, func, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from flask_login import UserMixin

Base = declarative_base()

class User(UserMixin, Base):
    __tablename__ = 'users'
    
    user_id = Column(Integer, primary_key=True)
    user_name = Column(String(100), nullable=False)
    gender = Column(String(6), nullable=False)
    birthday = Column(Date, nullable=False)
    phone_number = Column(BigInteger, nullable=False)
    email = Column(String(100), nullable=False, unique=True)
    username = Column(String(100), nullable=False, unique=True)
    password = Column(String(255), nullable=False)
    user_type = Column(String(6), nullable=False, default='Normal')
    created_at = Column(TIMESTAMP, default=func.now())
    
    # Relationship with appointments
    appointments = relationship("Appointment", back_populates="user", cascade="all, delete-orphan")
    
    def get_id(self):
        return str(self.user_id)
        
    def __repr__(self):
        return f"<User(user_id={self.user_id}, username={self.username}, user_type={self.user_type})>"


class CheckupType(Base):
    __tablename__ = 'checkup_types'
    
    checkup_id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=30)
    max_slots_per_time = Column(Integer, nullable=False, default=10)
    image_path = Column(String(255), nullable=True)
    is_active = Column(Integer, nullable=False, default=1)
    created_at = Column(TIMESTAMP, default=func.now())
    
    # Relationship with appointments
    appointments = relationship("Appointment", back_populates="checkup_type")
    
    def __repr__(self):
        return f"<CheckupType(checkup_id={self.checkup_id}, name={self.name}, price={self.price})>"


class Appointment(Base):
    __tablename__ = 'appointments'
    
    appointment_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.user_id', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    checkup_id = Column(Integer, ForeignKey('checkup_types.checkup_id'), nullable=False)
    checkup_name = Column(String(100), nullable=False)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)
    status = Column(String(20), nullable=False, default='Confirmed')
    price_paid = Column(Numeric(10, 2), nullable=False)
    created_at = Column(TIMESTAMP, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="appointments")
    checkup_type = relationship("CheckupType", back_populates="appointments")
    
    # Create an index on date, time, and checkup_id for faster lookups of slot availability
    __table_args__ = (
        Index('idx_appointment_slot', 'appointment_date', 'appointment_time', 'checkup_id'),
    )
    
    def __repr__(self):
        return f"<Appointment(appointment_id={self.appointment_id}, date={self.appointment_date}, time={self.appointment_time})>"


class Specialist(Base):
    __tablename__ = 'specialists'
    
    specialist_id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    title = Column(String(100), nullable=False)
    specialization = Column(String(100), nullable=False)
    bio = Column(Text, nullable=True)
    image_path = Column(String(255), nullable=True)
    is_active = Column(Integer, nullable=False, default=1)
    created_at = Column(TIMESTAMP, default=func.now())
    
    def __repr__(self):
        return f"<Specialist(specialist_id={self.specialist_id}, name={self.name}, specialization={self.specialization})>"


class HealthFact(Base):
    __tablename__ = 'health_facts'
    
    fact_id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=True)
    is_featured = Column(Integer, nullable=False, default=0)
    is_active = Column(Integer, nullable=False, default=1)
    created_at = Column(TIMESTAMP, default=func.now())
    
    def __repr__(self):
        return f"<HealthFact(fact_id={self.fact_id}, title={self.title})>"