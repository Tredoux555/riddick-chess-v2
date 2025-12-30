-- Secret Store Tables

-- Store access requests/users
CREATE TABLE IF NOT EXISTS secret_store_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP
);

-- Store products
CREATE TABLE IF NOT EXISTS secret_store_products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image VARCHAR(500),
  category VARCHAR(100) DEFAULT 'General',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Store settings
CREATE TABLE IF NOT EXISTS secret_store_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT
);

-- Insert default currency setting
INSERT INTO secret_store_settings (key, value) VALUES ('defaultCurrency', 'CNY')
ON CONFLICT (key) DO NOTHING;
