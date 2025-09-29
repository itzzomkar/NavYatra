const { Client } = require('pg');

async function setupDatabase() {
  // Connect as postgres user (you'll need to provide the password)
  const adminClient = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres' // Change this to your postgres password
  });

  try {
    await adminClient.connect();
    console.log('Connected to PostgreSQL as postgres user');

    // Create user
    try {
      await adminClient.query("CREATE USER kmrl_user WITH PASSWORD 'kmrl_password';");
      console.log('Created user kmrl_user');
    } catch (error) {
      if (error.code === '42710') {
        console.log('User kmrl_user already exists');
      } else {
        throw error;
      }
    }

    // Create database
    try {
      await adminClient.query('CREATE DATABASE kmrl_train_db OWNER kmrl_user;');
      console.log('Created database kmrl_train_db');
    } catch (error) {
      if (error.code === '42P04') {
        console.log('Database kmrl_train_db already exists');
      } else {
        throw error;
      }
    }

    await adminClient.end();

    // Connect to the new database and grant permissions
    const dbClient = new Client({
      host: 'localhost',
      port: 5432,
      database: 'kmrl_train_db',
      user: 'postgres',
      password: 'postgres' // Change this to your postgres password
    });

    await dbClient.connect();
    await dbClient.query('GRANT ALL ON SCHEMA public TO kmrl_user;');
    console.log('Granted permissions to kmrl_user');
    await dbClient.end();

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error.message);
    console.log('\nPlease try one of the following:');
    console.log('1. Update the password in this script to match your postgres user password');
    console.log('2. Or use pgAdmin to create the user and database manually');
    console.log('3. Or provide the postgres password when prompted');
  }
}

setupDatabase();
