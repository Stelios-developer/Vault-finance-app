CREATE DATABASE IF NOT EXISTS finance_manager;
USE finance_manager;

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('expense', 'income') NOT NULL,
    icon VARCHAR(50) DEFAULT 'cart'
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    amount INT NOT NULL,
    description VARCHAR(255),
    date DATE NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS budgets (
    category_id INT PRIMARY KEY,
    amount INT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);