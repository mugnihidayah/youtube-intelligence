"""
Centralized logger configuration using loguru.
"""

import sys
from pathlib import Path

from loguru import logger

# Remove default handler
logger.remove()

# Project root (3 levels up from this file)
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# Console handler — colored, readable
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> | <level>{level:<8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level="INFO",
    colorize=True,
)

# File handler — full detail, rotated
LOG_DIR = PROJECT_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)

logger.add(
    LOG_DIR / "pipeline_{time:YYYY-MM-DD}.log",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level:<8} | {name}:{function}:{line} - {message}",
    level="DEBUG",
    rotation="10 MB",
    retention="30 days",
    compression="zip",
)

# Export
log = logger
