export type EpiAttributeDef = {
  key: string;
  label: string;
  type: "text" | "select" | "date";
  options?: string[];
};

export const EPI_PREDEFINED_ATTRIBUTES: EpiAttributeDef[] = [
  { key: "taille", label: "Taille", type: "select", options: ["S", "M", "L", "XL", "XXL"] },
  { key: "norme_ce", label: "Norme CE", type: "text" },
  { key: "date_expiration", label: "Date d'expiration", type: "date" },
  { key: "couleur", label: "Couleur", type: "text" },
  { key: "materiau", label: "Matériau", type: "text" },
];
