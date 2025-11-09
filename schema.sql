-- ChronoBank Database Schema
-- This schema defines all the tables required for the application.
-- Members table: Stores user information including authentication details and roles.
CREATE TABLE IF NOT EXISTS `members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `contact` VARCHAR(255),
  `is_provider` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- Offers table: Stores services offered by providers.
CREATE TABLE IF NOT EXISTS `offers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `provider_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `skills` JSON, -- Storing skills as a JSON array of strings
  `rate_per_hour` DECIMAL(10, 2) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`provider_id`) REFERENCES `members`(`id`) ON DELETE CASCADE
);
-- Requests table: Members create requests for a specific offer.
CREATE TABLE IF NOT EXISTS `requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `offer_id` INT NOT NULL,
  `member_id` INT NOT NULL,
  `note` TEXT,
  `status` ENUM('OPEN', 'MATCHED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`offer_id`) REFERENCES `offers`(`id`),
  FOREIGN KEY (`member_id`) REFERENCES `members`(`id`)
);
-- Bookings table: Confirmed engagements between a member and a provider.
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `request_id` INT NOT NULL UNIQUE,
  `start_time` DATETIME NOT NULL,
  `duration_minutes` INT NOT NULL,
  `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`)
);
-- Escrow table: Holds time credits during a booking.
CREATE TABLE IF NOT EXISTS `escrow` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL UNIQUE,
  `amount` DECIMAL(10, 2) NOT NULL,
  `status` ENUM('HELD', 'RELEASED', 'REFUNDED') NOT NULL DEFAULT 'HELD',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`)
);
-- Ledger table: Tracks all time credit transactions.
CREATE TABLE IF NOT EXISTS `ledger` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `member_id` INT NOT NULL,
  `booking_id` INT,
  `amount` DECIMAL(10, 2) NOT NULL, -- Can be positive (credit) or negative (debit)
  `txn_type` ENUM('CREDIT', 'DEBIT', 'ADJUSTMENT', 'REFUND') NOT NULL,
  `balance_after` DECIMAL(10, 2) NOT NULL,
  `notes` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`member_id`) REFERENCES `members`(`id`),
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`)
);
-- Ratings table: Stores reviews for completed bookings.
CREATE TABLE IF NOT EXISTS `ratings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL UNIQUE,
  `rater_id` INT NOT NULL,
  `ratee_id` INT NOT NULL,
  `score` TINYINT NOT NULL CHECK (score >= 1 AND score <= 5),
  `comments` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`),
  FOREIGN KEY (`rater_id`) REFERENCES `members`(`id`),
  FOREIGN KEY (`ratee_id`) REFERENCES `members`(`id`)
);
-- Disputes table: Manages disputes raised for bookings.
CREATE TABLE IF NOT EXISTS `disputes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL UNIQUE,
  `reason` TEXT NOT NULL,
  `status` ENUM('OPEN', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
  `resolved_by_admin_id` INT,
  `resolution_notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`),
  FOREIGN KEY (`resolved_by_admin_id`) REFERENCES `members`(`id`)
);
-- Dispute Evidence table: Stores links to evidence for disputes.
CREATE TABLE IF NOT EXISTS `dispute_evidence` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dispute_id` INT NOT NULL,
  `evidence_type` VARCHAR(50) NOT NULL, -- e.g., 'screenshot', 'document'
  `uri` VARCHAR(2048) NOT NULL, -- URL to the evidence
  `uploaded_by_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`dispute_id`) REFERENCES `disputes`(`id`),
  FOREIGN KEY (`uploaded_by_id`) REFERENCES `members`(`id`)
);