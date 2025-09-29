/* eslint-disable @typescript-eslint/no-explicit-any */

export function buildEntrepriseJSON(inpi: any, pappers: any, bodacc: any, siret: string) {
  return {
    identite: {
      siret,
      siren: pappers?.siren || inpi?.siren || null,
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
        latitude: pappers?.siege?.latitude || null,
        longitude: pappers?.siege?.longitude || null,
        effectif: pappers?.effectif || pappers?.siege?.effectif || null,
        annee_effectif: pappers?.annee_effectif || null
      }
    },
    dirigeants: (pappers?.representants || [])
      .slice(0, 3) // limiter aux 3 principaux
      .map((r: any) => ({
        nom: r.nom_complet,
        fonction: r.qualite,
        date_prise_de_poste: r.date_prise_de_poste || null,
        age: r.age || null,
        nationalite: r.nationalite || null
      })),
    finances: (pappers?.finances || [])
      .slice(0, 5) // 5 derniers exercices max
      .map((f: any) => ({
        annee: f.annee,
        chiffre_affaires: f.chiffre_affaires,
        resultat: f.resultat,
        marge_nette: f.marge_nette,
        fonds_propres: f.fonds_propres,
        tresorerie: f.tresorerie,
        dettes: f.dettes_financieres,
        autonomie_financiere: f.autonomie_financiere,
        liquidite_generale: f.liquidite_generale,
        couverture_dettes: f.couverture_dettes,
        date_de_cloture_exercice: f.date_de_cloture_exercice
      })),
    publications_bodacc: (pappers?.publications_bodacc || [])
      .filter((p: any) =>
        ["Dépôt des comptes", "Procédure collective", "Modification"].includes(p.type)
      )
      .slice(0, 5)
      .map((p: any) => ({
        date: p.date,
        type: p.type,
        descriptif: p.descriptif || null
      })),
    procedures_collectives: (bodacc?.procedures || [])
      .filter((p: any) =>
        p.type?.toLowerCase().includes("redressement") ||
        p.type?.toLowerCase().includes("liquidation")
      )
  };
}
