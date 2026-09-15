-- 1. Users table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'viewer',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Organizations table
CREATE TABLE IF NOT EXISTS `organizations` (
    `id` VARCHAR(100) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `leaderId` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Members table
CREATE TABLE IF NOT EXISTS `members` (
    `id` VARCHAR(100) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `profileImage` LONGTEXT NULL,
    `family` VARCHAR(255) NULL,
    `birthdate` VARCHAR(50) NULL,
    `contact` VARCHAR(100) NULL,
    `address` TEXT NULL,
    `organizationId` VARCHAR(100) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Ministries table
CREATE TABLE IF NOT EXISTS `ministries` (
    `id` VARCHAR(100) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `datetime` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `participants` LONGTEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Pledges table
CREATE TABLE IF NOT EXISTS `pledges` (
    `id` VARCHAR(100) PRIMARY KEY,
    `type` VARCHAR(50) NOT NULL,
    `family` VARCHAR(255) NULL,
    `memberId` VARCHAR(100) NULL,
    `eventId` VARCHAR(100) NULL,
    `amount` DECIMAL(12, 2) DEFAULT 0.00,
    `pledgeAmount` DECIMAL(12, 2) DEFAULT 0.00,
    `paidAmount` DECIMAL(12, 2) DEFAULT 0.00,
    `status` VARCHAR(50) NULL,
    `pledgeStatus` VARCHAR(50) NULL,
    `notes` TEXT NULL,
    `thanksgivingDate` VARCHAR(50) NULL,
    `hospitalName` VARCHAR(255) NULL,
    `admissionDate` VARCHAR(50) NULL,
    `dischargeDate` VARCHAR(50) NULL,
    `groomName` VARCHAR(255) NULL,
    `brideName` VARCHAR(255) NULL,
    `weddingDate` VARCHAR(50) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default users if not exists
INSERT IGNORE INTO `users` (`id`, `username`, `password`, `role`) VALUES
(1, 'admin', 'admin', 'admin'),
(2, 'leader', 'leader', 'viewer');
