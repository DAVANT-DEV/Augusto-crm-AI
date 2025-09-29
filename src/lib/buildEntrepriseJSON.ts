type InpiData = Record<string, unknown> | null;
type PappersData = {
  siren?: string;
  nom_entreprise?: string;
  denomination?: string;
  forme_juridique?: string;
  capital?: number | null;
  date_creation?: string;
  code_naf?: string;
  libelle_code_naf?: string;
  greffe?: string;
  numero_rcs?: string;
  siege?: {
    adresse_ligne_1?: string;
    code_postal?: string;
    ville?: string;
    effectif?: string;
  };
  effectif?: string;
  annee_effectif?: number;
  representants?: Array<Record<string, unknown>>;
  finances?: Array<Record<string, unknown>>;
  publications_bodacc?: Array<Record<string, unknown>>;
} | null;
type BodaccData = {
  procedures?: Array<Record<string, unknown>>;
} | null;

export function buildEntrepriseJSON(
  inpi: InpiData,
  pappers: PappersData,
  bodacc: BodaccData,
  siret: string
) {
  return {
    identite: {
      siret,
      siren: pappers?.siren || (inpi as any)?.siren || null,
      denomination: pappers?.nom_entreprise || pappers?.denomination || null,
      forme_juridique: pappers?.forme_juridique || null,
      capital: pappers?.capital || null,
      date_creation: pappers?.date_creation || null,
      code_naf: pappers?.code_naf || null,
      libelle_naf: pappers?.libelle_code_naf || null,
      greffe: pappers?.greffe || null,
      rcs: pappers?.numero_rcs || null,
      siege: {
        adresse: pappers?.siege?.adresse_ligne_1 || null,
        code_postal: pappers?.siege?.code_postal || null,
        ville: pappers?.siege?.ville || null,
        effectif: pappers?.effectif || pappers?.siege?.effectif || null,
        annee_effectif: pappers?.annee_effectif || null
      }
    },
    dirigeants: (pappers?.representants || [])
      .slice(0, 3)
      .map((r) => ({
        nom: (r as any).nom_complet,
        fonction: (r as any).qualite,
        date_prise_de_poste: (r as any).date_prise_de_poste || null,
        age: (r as any).age || null,
        nationalite: (r as any).nationalite || null
      })),
    finances: {
      comptes_annuels: (pappers?.finances || [])
        .slice(0, 3)
        .map((f) => ({
          annee: (f as any).annee,
          chiffre_affaires: (f as any).chiffre_affaires,
          resultat: (f as any).resultat,
          marge_nette: (f as any).marge_nette,
          fonds_propres: (f as any).fonds_propres,
          dettes: (f as any).dettes_financieres
        }))
    },
    publications_bodacc: (pappers?.publications_bodacc || [])
      .filter((p) =>
        ["Dépôt des comptes", "Procédure collective", "Modification"].includes(
          (p as any).type
        )
      )
      .slice(0, 5)
      .map((p) => ({
        date: (p as any).date,
        type: (p as any).type,
        descriptif: (p as any).descriptif || null
      })),
    procedures_collectives: (bodacc?.procedures || [])
      .filter(
        (p) =>
          (p as any).type?.toLowerCase().includes("redressement") ||
          (p as any).type?.toLowerCase().includes("liquidation")
      )
  };
}
