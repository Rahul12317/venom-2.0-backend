from main import engine, Base

# Yeh command database ki saari tables ko drop kar degi aur fresh recreate kar degi
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

print("Database cleared and re-created successfully!")