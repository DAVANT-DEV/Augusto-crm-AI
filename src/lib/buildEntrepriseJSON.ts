type InpiData = Record<string, unknown> | null;
type PappersData = Record<string, unknown> | null;
type BodaccData = Record<string, unknown> | null;

export function buildEntrepriseJSON(
  inpi: InpiData,
  pappers: PappersData,
  bodacc: BodaccData,
  siret: string
) {
  return {
    identite: {
      siret,
      siren: (pappers?.["siren"] as string) || (inpi?.["siren"] as string) || null,
      denomination:
        (pappers?.["nom_entreprise"] as string) ||
        (pappers?.["denomination"] as string) ||
        null,
      forme_juridique: (pappers?.["forme_juridique"] as string) || null,
      capital: (pappers?.["capital"] as number) || null,
      date_creation: (pappers?.["date_creation"] as string) || null,
      code_naf: (pappers?.["code_naf"] as string) || null,
      libelle_naf: (pappers?.["libelle_code_naf"] as string) || null,
      greffe: (pappers?.["greffe"] as string) || null,
      rcs: (pappers?.["numero_rcs"] as string) || null,
      siege: {
        adresse:
          (pappers?.["siege"] as Record<string, unknown>)?.[
            "adresse_ligne_1"
          ] || null,
        code_postal:
          (pappers?.["siege"] as Record<string, unknown>)?.["code_postal"] ||
          null,
        ville:
          (pappers?.["siege"] as Record<string, unknown>)?.["ville"] || null,
        effectif:
          (pappers?.["effectif"] as string) ||
          ((pappers?.["siege"] as Record<string, unknown>)?.["effectif"] as
            string) ||
          null,
        annee_effectif: (pappers?.["annee_effectif"] as number) || null,
      },
    },
    dirigeants: ((pappers?.["representants"] as Array<Record<string, unknown>>) ||
      []
    )
      .slice(0, 3)
      .map((r) => ({
        nom: r["nom_complet"] as string,
        fonction: r["qualite"] as string,
        date_prise_de_poste: (r["date_prise_de_poste"] as string) || null,
        age: (r["age"] as number) || null,
        nationalite: (r["nationalite"] as string) || null,
      })),
    finances: {
      comptes_annuels: ((pappers?.["finances"] as Array<Record<string, unknown>>) ||
        []
      )
        .slice(0, 3)
        .map((f) => ({
          annee: f["annee"] as number,
          chiffre_affaires: f["chiffre_affaires"] as number,
          resultat: f["resultat"] as number,
          marge_nette: f["marge_nette"] as number,
          fonds_propres: f["fonds_propres"] as number,
          dettes: f["dettes_financieres"] as number,
        })),
    },
    publications_bodacc: ((pappers?.["publications_bodacc"] as Array<
      Record<string, unknown>
    >) || [])
      .filter((p) =>
        ["Dépôt des comptes", "Procédure collective", "Modification"].includes(
          p["type"] as string
        )
      )
      .slice(0, 5)
      .map((p) => ({
        date: p["date"] as string,
        type: p["type"] as string,
        descriptif: (p["descriptif"] as string) || null,
      })),
    procedures_collectives: ((bodacc?.["procedures"] as Array<
      Record<string, unknown>
    >) || []).filter((p) => {
      const type = (p["type"] as string)?.toLowerCase();
      return type?.includes("redressement") || type?.includes("liquidation");
    }),
  };
}
