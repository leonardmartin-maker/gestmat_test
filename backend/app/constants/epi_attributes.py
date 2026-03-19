"""Attributs prédéfinis pour les catégories EPI."""

EPI_PREDEFINED_ATTRIBUTES = [
    {
        "key": "taille",
        "label": "Taille",
        "type": "select",
        "options": ["S", "M", "L", "XL", "XXL"],
    },
    {
        "key": "norme_ce",
        "label": "Norme CE",
        "type": "text",
    },
    {
        "key": "date_expiration",
        "label": "Date d'expiration",
        "type": "date",
    },
    {
        "key": "couleur",
        "label": "Couleur",
        "type": "text",
    },
    {
        "key": "materiau",
        "label": "Matériau",
        "type": "text",
    },
]

VALID_ATTRIBUTE_KEYS = {attr["key"] for attr in EPI_PREDEFINED_ATTRIBUTES}
