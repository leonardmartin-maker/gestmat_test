"""
Plans de maintenance constructeur pour les scooters de la flotte.
Chaque entrée = 1 tâche d'entretien pour 1 modèle.
interval_km et interval_days : le premier atteint déclenche l'alerte.
"""

SCOOTER_MAINTENANCE_TEMPLATES: list[dict] = [
    # ── Yamaha RayZR 125 ──
    {"model_name": "Yamaha RayZR 125", "task_name": "Vidange huile moteur", "interval_km": 4000, "interval_days": 180},
    {"model_name": "Yamaha RayZR 125", "task_name": "Filtre à air", "interval_km": 8000, "interval_days": 365},
    {"model_name": "Yamaha RayZR 125", "task_name": "Bougie", "interval_km": 8000, "interval_days": 365},
    {"model_name": "Yamaha RayZR 125", "task_name": "Courroie variateur", "interval_km": 20000, "interval_days": 730},

    # ── Honda NSC110 Vision ──
    {"model_name": "Honda NSC110 Vision", "task_name": "Vidange huile moteur", "interval_km": 4000, "interval_days": 180},
    {"model_name": "Honda NSC110 Vision", "task_name": "Filtre à air", "interval_km": 16000, "interval_days": 730},
    {"model_name": "Honda NSC110 Vision", "task_name": "Bougie", "interval_km": 16000, "interval_days": 730},
    {"model_name": "Honda NSC110 Vision", "task_name": "Courroie variateur", "interval_km": 24000, "interval_days": 730},

    # ── Honda SH125 ──
    {"model_name": "Honda SH125", "task_name": "Vidange huile moteur", "interval_km": 4000, "interval_days": 180},
    {"model_name": "Honda SH125", "task_name": "Filtre à air", "interval_km": 16000, "interval_days": 730},
    {"model_name": "Honda SH125", "task_name": "Bougie", "interval_km": 16000, "interval_days": 730},
    {"model_name": "Honda SH125", "task_name": "Courroie variateur", "interval_km": 24000, "interval_days": 730},

    # ── Honda PCX 125 ──
    {"model_name": "Honda PCX 125", "task_name": "Vidange huile moteur", "interval_km": 6000, "interval_days": 365},
    {"model_name": "Honda PCX 125", "task_name": "Bougie", "interval_km": 12000, "interval_days": 730},
    {"model_name": "Honda PCX 125", "task_name": "Filtre à air", "interval_km": 18000, "interval_days": 730},
    {"model_name": "Honda PCX 125", "task_name": "Courroie variateur", "interval_km": 24000, "interval_days": 730},
    {"model_name": "Honda PCX 125", "task_name": "Liquide de frein", "interval_km": None, "interval_days": 730},
    {"model_name": "Honda PCX 125", "task_name": "Liquide de refroidissement", "interval_km": None, "interval_days": 1095},
]

KNOWN_MODELS: list[str] = sorted(set(t["model_name"] for t in SCOOTER_MAINTENANCE_TEMPLATES))
