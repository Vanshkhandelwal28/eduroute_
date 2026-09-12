package main

import (
	"database/sql"
	"fmt"
)

// ensureBuddySchema creates the buddy tables if they don't exist
func ensureBuddySchema(db *sql.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS buddy_conversations (
			id VARCHAR(100) PRIMARY KEY,
			user_id INT UNSIGNED NOT NULL,
			title VARCHAR(500) NOT NULL,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			INDEX idx_user_id (user_id),
			INDEX idx_updated_at (updated_at)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

		`CREATE TABLE IF NOT EXISTS buddy_messages (
			id VARCHAR(100) PRIMARY KEY,
			conversation_id VARCHAR(100) NOT NULL,
			role ENUM('user', 'assistant', 'system') NOT NULL,
			content LONGTEXT NOT NULL,
			created_at DATETIME NOT NULL,
			FOREIGN KEY (conversation_id) REFERENCES buddy_conversations(id) ON DELETE CASCADE,
			INDEX idx_conversation_id (conversation_id),
			INDEX idx_created_at (created_at)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	}

	for index, statement := range statements {
		if _, err := db.Exec(statement); err != nil {
			return fmt.Errorf("buddy schema statement %d: %w", index+1, err)
		}
	}
	return nil
}
