-- KMRL Train Induction System - Initial Schema Migration
-- This script sets up the complete database schema for the KMRL Train Induction System

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'OPERATOR', 'MAINTENANCE', 'VIEWER');
CREATE TYPE "TrainsetStatus" AS ENUM ('AVAILABLE', 'IN_SERVICE', 'MAINTENANCE', 'OUT_OF_ORDER', 'CLEANING', 'DECOMMISSIONED');
CREATE TYPE "FitnessStatus" AS ENUM ('VALID', 'EXPIRED', 'PENDING', 'INVALID', 'UNDER_REVIEW');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');
CREATE TYPE "JobPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY');
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'SCHEDULED', 'INSPECTION');
CREATE TYPE "BrandingStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'PENDING');
CREATE TYPE "Shift" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT');
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'GENERATED');
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'ERROR', 'SUCCESS', 'MAINTENANCE', 'SCHEDULE', 'SYSTEM');
CREATE TYPE "ConfigType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');

-- Users table
CREATE TABLE "users" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Permissions table
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- User permissions junction table
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    
    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_permissions_userId_permissionId_key" UNIQUE ("userId", "permissionId")
);

-- Trainsets table
CREATE TABLE "trainsets" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "trainsetNumber" TEXT NOT NULL UNIQUE,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "yearOfManufacture" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "maxSpeed" DOUBLE PRECISION NOT NULL,
    "currentMileage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalMileage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "TrainsetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "depot" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "trainsets_pkey" PRIMARY KEY ("id")
);

-- Fitness certificates table
CREATE TABLE "fitness_certificates" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "trainsetId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL UNIQUE,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" "FitnessStatus" NOT NULL,
    "issuingAuthority" TEXT NOT NULL,
    "remarks" TEXT,
    "documents" TEXT[],
    "iotData" JSONB,
    "lastChecked" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "fitness_certificates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fitness_certificates_trainsetId_fkey" FOREIGN KEY ("trainsetId") REFERENCES "trainsets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Job cards table
CREATE TABLE "job_cards" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "trainsetId" TEXT NOT NULL,
    "jobCardNumber" TEXT NOT NULL UNIQUE,
    "maximoId" TEXT,
    "priority" "JobPriority" NOT NULL,
    "status" "JobStatus" NOT NULL,
    "workType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "assignedTo" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "notes" TEXT,
    "externalData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "job_cards_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "job_cards_trainsetId_fkey" FOREIGN KEY ("trainsetId") REFERENCES "trainsets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Maintenance records table
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "trainsetId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "parts" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "maintenance_records_trainsetId_fkey" FOREIGN KEY ("trainsetId") REFERENCES "trainsets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Branding records table
CREATE TABLE "branding_records" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "trainsetId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "campaignId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "exposureTarget" DOUBLE PRECISION,
    "actualExposure" DOUBLE PRECISION,
    "revenue" DOUBLE PRECISION,
    "status" "BrandingStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "branding_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "branding_records_trainsetId_fkey" FOREIGN KEY ("trainsetId") REFERENCES "trainsets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Mileage records table
CREATE TABLE "mileage_records" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "trainsetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startMileage" DOUBLE PRECISION NOT NULL,
    "endMileage" DOUBLE PRECISION NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "routeInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "mileage_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mileage_records_trainsetId_fkey" FOREIGN KEY ("trainsetId") REFERENCES "trainsets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Schedules table
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "date" TIMESTAMP(3) NOT NULL,
    "shift" "Shift" NOT NULL,
    "status" "ScheduleStatus" NOT NULL,
    "totalTrainsets" INTEGER NOT NULL,
    "optimizationScore" DOUBLE PRECISION,
    "constraints" JSONB,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "modifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "schedules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "schedules_modifiedById_fkey" FOREIGN KEY ("modifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Schedule entries table
CREATE TABLE "schedule_entries" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "scheduleId" TEXT NOT NULL,
    "trainsetId" TEXT NOT NULL,
    "assignedPosition" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,
    "reasoning" TEXT,
    "fitnessStatus" "FitnessStatus" NOT NULL,
    "jobCardStatus" "JobStatus" NOT NULL,
    "brandingPriority" INTEGER,
    "mileageBalance" DOUBLE PRECISION,
    "cleaningSlot" TEXT,
    "estimatedDeparture" TIMESTAMP(3),
    "actualDeparture" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "schedule_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "schedule_entries_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "schedule_entries_trainsetId_fkey" FOREIGN KEY ("trainsetId") REFERENCES "trainsets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "schedule_entries_scheduleId_trainsetId_key" UNIQUE ("scheduleId", "trainsetId")
);

-- Optimization results table
CREATE TABLE "optimization_results" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "date" TIMESTAMP(3) NOT NULL,
    "algorithm" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "executionTime" INTEGER NOT NULL,
    "solutions" JSONB NOT NULL,
    "constraints" JSONB NOT NULL,
    "feedback" JSONB,
    "isImplemented" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "optimization_results_pkey" PRIMARY KEY ("id")
);

-- Configurations table
CREATE TABLE "configurations" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "key" TEXT NOT NULL UNIQUE,
    "value" TEXT NOT NULL,
    "type" "ConfigType" NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "configurations_pkey" PRIMARY KEY ("id")
);

-- Notifications table
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Audit logs table
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Stabling positions table
CREATE TABLE "stabling_positions" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "positionNumber" INTEGER NOT NULL UNIQUE,
    "type" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "features" JSONB,
    "coordinates" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "stabling_positions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better performance
CREATE INDEX "idx_users_email" ON "users"("email");
CREATE INDEX "idx_users_role" ON "users"("role");
CREATE INDEX "idx_users_active" ON "users"("isActive");

CREATE INDEX "idx_trainsets_number" ON "trainsets"("trainsetNumber");
CREATE INDEX "idx_trainsets_status" ON "trainsets"("status");
CREATE INDEX "idx_trainsets_depot" ON "trainsets"("depot");
CREATE INDEX "idx_trainsets_active" ON "trainsets"("isActive");

CREATE INDEX "idx_fitness_trainset" ON "fitness_certificates"("trainsetId");
CREATE INDEX "idx_fitness_status" ON "fitness_certificates"("status");
CREATE INDEX "idx_fitness_expiry" ON "fitness_certificates"("expiryDate");
CREATE INDEX "idx_fitness_certificate_number" ON "fitness_certificates"("certificateNumber");

CREATE INDEX "idx_job_cards_trainset" ON "job_cards"("trainsetId");
CREATE INDEX "idx_job_cards_status" ON "job_cards"("status");
CREATE INDEX "idx_job_cards_priority" ON "job_cards"("priority");
CREATE INDEX "idx_job_cards_scheduled" ON "job_cards"("scheduledDate");

CREATE INDEX "idx_maintenance_trainset" ON "maintenance_records"("trainsetId");
CREATE INDEX "idx_maintenance_type" ON "maintenance_records"("type");
CREATE INDEX "idx_maintenance_performed" ON "maintenance_records"("performedAt");
CREATE INDEX "idx_maintenance_due" ON "maintenance_records"("nextDueDate");

CREATE INDEX "idx_branding_trainset" ON "branding_records"("trainsetId");
CREATE INDEX "idx_branding_status" ON "branding_records"("status");
CREATE INDEX "idx_branding_dates" ON "branding_records"("startDate", "endDate");

CREATE INDEX "idx_mileage_trainset" ON "mileage_records"("trainsetId");
CREATE INDEX "idx_mileage_date" ON "mileage_records"("date");

CREATE INDEX "idx_schedules_date" ON "schedules"("date");
CREATE INDEX "idx_schedules_status" ON "schedules"("status");
CREATE INDEX "idx_schedules_created_by" ON "schedules"("createdById");

CREATE INDEX "idx_schedule_entries_schedule" ON "schedule_entries"("scheduleId");
CREATE INDEX "idx_schedule_entries_trainset" ON "schedule_entries"("trainsetId");
CREATE INDEX "idx_schedule_entries_position" ON "schedule_entries"("assignedPosition");

CREATE INDEX "idx_optimization_date" ON "optimization_results"("date");
CREATE INDEX "idx_optimization_algorithm" ON "optimization_results"("algorithm");
CREATE INDEX "idx_optimization_implemented" ON "optimization_results"("isImplemented");

CREATE INDEX "idx_notifications_user" ON "notifications"("userId");
CREATE INDEX "idx_notifications_read" ON "notifications"("isRead");
CREATE INDEX "idx_notifications_type" ON "notifications"("type");
CREATE INDEX "idx_notifications_created" ON "notifications"("createdAt");

CREATE INDEX "idx_audit_logs_user" ON "audit_logs"("userId");
CREATE INDEX "idx_audit_logs_resource" ON "audit_logs"("resource");
CREATE INDEX "idx_audit_logs_timestamp" ON "audit_logs"("timestamp");

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON "permissions" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_trainsets_updated_at BEFORE UPDATE ON "trainsets" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_fitness_certificates_updated_at BEFORE UPDATE ON "fitness_certificates" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_job_cards_updated_at BEFORE UPDATE ON "job_cards" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_maintenance_records_updated_at BEFORE UPDATE ON "maintenance_records" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_branding_records_updated_at BEFORE UPDATE ON "branding_records" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON "schedules" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_schedule_entries_updated_at BEFORE UPDATE ON "schedule_entries" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_configurations_updated_at BEFORE UPDATE ON "configurations" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_stabling_positions_updated_at BEFORE UPDATE ON "stabling_positions" FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
