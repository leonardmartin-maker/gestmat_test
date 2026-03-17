from __future__ import annotations

import hashlib
from typing import Any

# Champs jamais loggés (global)
GLOBAL_DENY = {
    "password",
    "password_hash",
    "access_token",
    "refresh_token",
    "token",
    "secret",
}

# Champs sensibles: on garde la présence mais on masque la valeur
GLOBAL_REDACT = {
    "notes",  # à discuter: si notes peuvent contenir du perso -> masque par défaut (RGPD)
}

# Par modèle: denylist fine
MODEL_DENY: dict[str, set[str]] = {
    "USER": {"password_hash"},
    # "EVENT": {"notes"},  # si tu veux aussi exclure/masquer au niveau Event
}

MODEL_REDACT: dict[str, set[str]] = {
    "EVENT": {"notes"},  # recommandé si notes = texte libre (potentiellement perso)
}

def _mask(value: Any) -> str:
    if value is None:
        return "REDACTED"
    # on évite d’exposer la longueur exacte si texte long
    return "REDACTED"

def sanitize(entity_type: str, data: dict | None) -> dict | None:
    if data is None:
        return None

    deny = set(GLOBAL_DENY) | MODEL_DENY.get(entity_type, set())
    redact = set(GLOBAL_REDACT) | MODEL_REDACT.get(entity_type, set())

    out: dict = {}
    for k, v in data.items():
        if k in deny:
            continue
        if k in redact:
            out[k] = _mask(v)
        else:
            out[k] = v
    return out

def hash_ip(ip: str | None, salt: str) -> str | None:
    if not ip:
        return None
    # IP pseudonymisée (RGPD-friendly)
    h = hashlib.sha256((salt + ip).encode("utf-8")).hexdigest()
    return h