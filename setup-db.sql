-- Setup script for KMRL Train Induction Database
CREATE USER kmrl_user WITH PASSWORD 'kmrl_password';
CREATE DATABASE kmrl_train_db OWNER kmrl_user;
GRANT ALL PRIVILEGES ON DATABASE kmrl_train_db TO kmrl_user;
\c kmrl_train_db;
GRANT ALL ON SCHEMA public TO kmrl_user;
