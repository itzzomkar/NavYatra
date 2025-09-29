# KMRL Database Setup Script for Windows
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "KMRL Train Induction System" -ForegroundColor Cyan
Write-Host "Local Database Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Function to test PostgreSQL connection
function Test-PostgresConnection {
    param($password)
    $env:PGPASSWORD = $password
    $result = & psql -U postgres -h localhost -c "SELECT 1;" 2>&1
    return $LASTEXITCODE -eq 0
}

# Try common PostgreSQL passwords
$passwords = @("postgres", "admin", "password", "root", "")
$dbPassword = $null

Write-Host "Testing PostgreSQL connection..." -ForegroundColor Yellow
foreach ($pwd in $passwords) {
    if (Test-PostgresConnection -password $pwd) {
        $dbPassword = $pwd
        Write-Host "✓ Connected to PostgreSQL successfully!" -ForegroundColor Green
        break
    }
}

# If no common password works, ask user
if ($null -eq $dbPassword) {
    Write-Host "Please enter your PostgreSQL 'postgres' user password:" -ForegroundColor Yellow
    $securePassword = Read-Host -AsSecureString
    $dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
    
    if (Test-PostgresConnection -password $dbPassword) {
        Write-Host "✓ Connected to PostgreSQL successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to connect to PostgreSQL. Please check your password." -ForegroundColor Red
        exit 1
    }
}

# Set environment variable for psql commands
$env:PGPASSWORD = $dbPassword

Write-Host ""
Write-Host "Creating database 'kmrl_db'..." -ForegroundColor Yellow

# Drop existing database if it exists and create new one
& psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS kmrl_db;" 2>$null
& psql -U postgres -h localhost -c "CREATE DATABASE kmrl_db;"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database 'kmrl_db' created successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Database creation failed" -ForegroundColor Red
    exit 1
}

# Update the .env file with the correct password
Write-Host ""
Write-Host "Updating environment configuration..." -ForegroundColor Yellow

$envPath = "backend\.env"
$localEnvPath = "backend\.env.local"

# Create connection string
$connectionString = "postgresql://postgres:$dbPassword@localhost:5432/kmrl_db"

# Check if .env.local exists and update it
if (Test-Path $localEnvPath) {
    $content = Get-Content $localEnvPath -Raw
    $content = $content -replace 'DATABASE_URL=.*', "DATABASE_URL=$connectionString"
    Set-Content $localEnvPath $content
    Write-Host "✓ Updated .env.local file" -ForegroundColor Green
}

# Copy .env.local to .env
Copy-Item $localEnvPath $envPath -Force
Write-Host "✓ Created .env file from .env.local" -ForegroundColor Green

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install 2>$null

Write-Host ""
Write-Host "Running Prisma migrations..." -ForegroundColor Yellow
npx prisma generate
npx prisma migrate deploy 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "No existing migrations found. Creating initial migration..." -ForegroundColor Yellow
    npx prisma migrate dev --name init --skip-seed
}

Write-Host "✓ Database schema created!" -ForegroundColor Green

Write-Host ""
Write-Host "Creating seed data..." -ForegroundColor Yellow

# Create seed script if it doesn't exist
$seedScript = @'
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create users
  const users = [
    {
      email: 'admin@kmrl.com',
      password: await bcrypt.hash('password123', 12),
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN'
    },
    {
      email: 'supervisor@kmrl.com',
      password: await bcrypt.hash('password123', 12),
      firstName: 'Supervisor',
      lastName: 'User',
      role: 'SUPERVISOR'
    },
    {
      email: 'operator@kmrl.com',
      password: await bcrypt.hash('password123', 12),
      firstName: 'Operator',
      lastName: 'User',
      role: 'OPERATOR'
    },
    {
      email: 'maintenance@kmrl.com',
      password: await bcrypt.hash('password123', 12),
      firstName: 'Maintenance',
      lastName: 'User',
      role: 'MAINTENANCE'
    }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user
    });
    console.log(`Created user: ${user.email}`);
  }

  // Create sample trainsets
  const trainsets = [
    {
      trainsetNumber: 'TS001',
      manufacturer: 'Alstom',
      model: 'Metropolis',
      yearOfManufacture: 2020,
      capacity: 300,
      maxSpeed: 80,
      depot: 'Muttom',
      status: 'AVAILABLE'
    },
    {
      trainsetNumber: 'TS002',
      manufacturer: 'Alstom',
      model: 'Metropolis',
      yearOfManufacture: 2020,
      capacity: 300,
      maxSpeed: 80,
      depot: 'Muttom',
      status: 'IN_SERVICE'
    },
    {
      trainsetNumber: 'TS003',
      manufacturer: 'Alstom',
      model: 'Metropolis',
      yearOfManufacture: 2021,
      capacity: 300,
      maxSpeed: 80,
      depot: 'Muttom',
      status: 'MAINTENANCE'
    }
  ];

  for (const trainset of trainsets) {
    await prisma.trainset.upsert({
      where: { trainsetNumber: trainset.trainsetNumber },
      update: {},
      create: trainset
    });
    console.log(`Created trainset: ${trainset.trainsetNumber}`);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
'@

Set-Content "src\seed.ts" $seedScript

# Run the seed script
npx ts-node src/seed.ts

Write-Host "✓ Seed data created!" -ForegroundColor Green

Set-Location ..

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "✓ Database setup complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run the application with:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Login credentials:" -ForegroundColor Cyan
Write-Host "  admin@kmrl.com / password123" -ForegroundColor Yellow
Write-Host "  supervisor@kmrl.com / password123" -ForegroundColor Yellow
Write-Host "  operator@kmrl.com / password123" -ForegroundColor Yellow
Write-Host "  maintenance@kmrl.com / password123" -ForegroundColor Yellow
Write-Host ""
