import os
import sqlite3
import datetime
from typing import Optional

class TranslationCache:
    def __init__(self, db_path: Optional[str] = None):
        if not db_path:
            # Set default path in ai-service/core/translation_cache.db
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            core_dir = os.path.join(base_dir, "core")
            os.makedirs(core_dir, exist_ok=True)
            db_path = os.path.join(core_dir, "translation_cache.db")
        
        self.db_path = db_path
        self._init_db()

    def _get_conn(self):
        # Establish SQLite connection with a high timeout to prevent busy lock errors
        conn = sqlite3.connect(self.db_path, timeout=30.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS translation_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_text TEXT NOT NULL,
                    source_lang TEXT NOT NULL,
                    target_lang TEXT NOT NULL,
                    translated_text TEXT NOT NULL,
                    domain TEXT NOT NULL DEFAULT 'default',
                    provider TEXT NOT NULL DEFAULT 'local',
                    model_name TEXT NOT NULL DEFAULT 'opus-mt',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            # Create a unique index for source_text + source_lang + target_lang + domain
            conn.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_translation_unique 
                ON translation_cache(source_text, source_lang, target_lang, domain)
            """)
            conn.commit()

    def get(self, source_text: str, source_lang: str = "en", target_lang: str = "zh", domain: str = "default") -> Optional[str]:
        """Retrieves a cached translation if it exists."""
        if not source_text:
            return None
            
        src = source_text.strip()
        try:
            with self._get_conn() as conn:
                cursor = conn.execute("""
                    SELECT translated_text FROM translation_cache
                    WHERE source_text = ? AND source_lang = ? AND target_lang = ? AND domain = ?
                """, (src, source_lang.strip(), target_lang.strip(), domain.strip()))
                row = cursor.fetchone()
                if row:
                    return row["translated_text"]
        except Exception as e:
            print(f"[TranslationCache] Read error: {e}")
        return None

    def set(self, source_text: str, translated_text: str, source_lang: str = "en", target_lang: str = "zh", domain: str = "default", provider: str = "local", model_name: str = "opus-mt"):
        """Saves or updates a translation record in the cache."""
        if not source_text or not translated_text:
            return
            
        src = source_text.strip()
        trans = translated_text.strip()
        now = datetime.datetime.now().isoformat()
        try:
            with self._get_conn() as conn:
                conn.execute("""
                    INSERT INTO translation_cache (
                        source_text, source_lang, target_lang, translated_text, domain, provider, model_name, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(source_text, source_lang, target_lang, domain) DO UPDATE SET
                        translated_text = excluded.translated_text,
                        provider = excluded.provider,
                        model_name = excluded.model_name,
                        updated_at = excluded.updated_at
                """, (src, source_lang.strip(), target_lang.strip(), trans, domain.strip(), provider.strip(), model_name.strip(), now, now))
                conn.commit()
        except Exception as e:
            print(f"[TranslationCache] Write error: {e}")
