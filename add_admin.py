from main import SessionLocal, AdminModel

db = SessionLocal()

# Apna admin phone number yahan daalein
admin_phone = "9170980044"

existing = db.query(AdminModel).filter(AdminModel.phone == admin_phone).first()
if not existing:
    new_admin = AdminModel(phone=admin_phone)
    db.add(new_admin)
    db.commit()
    print("Admin added successfully!")
else:
    print("Admin already exists!")

db.close()