const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Create a connection to the MySQL server (not database)
const getMySqlConnection = async () => {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_ROOT_USER || 'root',
    password: process.env.DB_ROOT_PASSWORD || '',
    multipleStatements: true
  });
};

// Create a new database and execute SQL file
exports.createDatabase = async (dbName, dbUser, dbPassword, sqlFilePath) => {
  const connection = await getMySqlConnection();
  
  try {
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    
    // Create user if it doesn't exist
    await connection.query(`
      CREATE USER IF NOT EXISTS '${dbUser}'@'root' IDENTIFIED BY '${dbPassword}';
      GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%';
      FLUSH PRIVILEGES;
    `);
    
    // Connect to the newly created database
    await connection.query(`USE \`${dbName}\``);
    
    // Read and execute SQL file if provided
    if (sqlFilePath) {
      const sqlFile = await fs.readFile(path.resolve(sqlFilePath), 'utf8');
      
      // Execute the SQL file content
      await connection.query(sqlFile);
      console.log(`SQL file ${sqlFilePath} executed successfully.`);
    }
    
    return {
      success: true,
      name: dbName,
      username: dbUser,
      password: dbPassword
    };
  } catch (error) {
    console.error('Error creating database or executing SQL file:', error);
    throw error;
  } finally {
    await connection.end();
  }
};

// Delete a database
exports.deleteDatabase = async (dbName, dbUser) => {
  const connection = await getMySqlConnection();
  
  try {
    // Drop database if it exists
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    
    // Drop user if it exists
    await connection.query(`
      DROP USER IF EXISTS '${dbUser}'@'%';
      FLUSH PRIVILEGES;
    `);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting database:', error);
    throw error;
  } finally {
    await connection.end();
  }
};

// Modify database user password
exports.updateDatabasePassword = async (dbUser, newPassword) => {
  const connection = await getMySqlConnection();
  
  try {
    await connection.query(`
      ALTER USER '${dbUser}'@'%' IDENTIFIED BY '${newPassword}';
      FLUSH PRIVILEGES;
    `);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating database password:', error);
    throw error;
  } finally {
    await connection.end();
  }
};

// Check if database exists
exports.checkDatabaseExists = async (dbName) => {
  const connection = await getMySqlConnection();
  
  try {
    const [rows] = await connection.query(`
      SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA 
      WHERE SCHEMA_NAME = '${dbName}'
    `);
    
    return rows.length > 0;
  } catch (error) {
    console.error('Error checking database existence:', error);
    throw error;
  } finally {
    await connection.end();
  }
};