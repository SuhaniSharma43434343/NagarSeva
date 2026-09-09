"""Database inspection helper. Credentials belong in the environment."""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect

if __name__ == "__main__":
    load_dotenv()
    with create_engine(os.environ["DATABASE_URL"]).connect() as connection:
        print(inspect(connection).get_table_names())
