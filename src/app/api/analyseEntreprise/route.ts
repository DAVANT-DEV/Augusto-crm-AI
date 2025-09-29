/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildEntrepriseJSON } from "@/lib/buildEntrepriseJSON";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siret = searchParams.get("siret");

    if (!siret) {
      return NextResponse.json(
        { error: "Paramètre `siret` requis" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const siren = siret.slice(0, 9);

    const [inpiRes, pappersRes, bodaccRes] = await Promise.allSettled([
      fetch(`https://inpi-crm-project.vercel.app/api/companies?siren=${siren}`),
      fetch(`https://pappers-vercel.vercel.app/api/enrichir?siret=${siret}`),
      fetch(`https://vercel-bodacc.vercel.app/api/bodacc?id=${siret}`)
    ]);

    const inpi = inpiRes.status === "fulfilled" ? await inpiRes.value.json() : null;
    const pappers = pappersRes.status === "fulfilled" ? await pappersRes.value.json() : null;
    const bodacc = bodaccRes.status === "fulfilled" ? await bodaccRes.value.json() : null;

    const entreprise = buildEntrepriseJSON(inpi, pappers, bodacc, siret);

    const prompt = `
Contexte : 
Notre entreprise est DAVANT, qui commercialise la marque Augusto Pizza, fournisseur de solutions de restauration clé en main. 
Nous proposons les fours Augusto pizzas, une offre destinée aux professionnels souhaitant diversifier leur activité avec des pizzas artisanales de qualité. 
Nos clients typiques : hôtels, campings, commerces de proximité, clubs de sport, bars, caves à bière, stations-service, buralistes, casinos, golfs, restaurants et aires de loisirs. 
Nous offrons installation simple, formation, SAV, programme de fidélité et approvisionnement flexible. 

Analyse les données suivantes (issues d'INPI, Pappers, BODACC) et réponds uniquement au format JSON avec deux clés :
- "score" : un entier entre 0 et 100 reflétant la pertinence de l’entreprise comme partenaire potentiel pour DAVANT.
- "analyse" : un texte concis de 3 à 4 phrases maximum, direct et factuel. 
Le texte doit couvrir structure, finances, risques éventuels et pertinence vis-à-vis de DAVANT.

Ne mets rien d’autre que ce JSON.

Données :
${JSON.stringify(entreprise, null, 2)}
`;

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: prompt,
    });

    let output = response.output_text.trim();
    if (output.startsWith("```")) {
      output = output.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    const gptResult = JSON.parse(output);

    const finances = (pappers?.finances || []).slice(0, 5).map((f: any) => ({
      annee: f.annee,
      chiffre_affaires: f.chiffre_affaires,
      resultat: f.resultat,
      fonds_propres: f.fonds_propres,
      tresorerie: f.tresorerie,
      dettes_financieres: f.dettes_financieres,
      autonomie_financiere: f.autonomie_financiere,
      liquidite_generale: f.liquidite_generale,
      couverture_dettes: f.couverture_dettes,
      date_de_cloture_exercice: f.date_de_cloture_exercice,
    }));

    return NextResponse.json(
      { ...gptResult, finances },
      { headers: corsHeaders() }
    );

  } catch (error: any) {
    console.error("Erreur API analyseEntreprise:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// ✅ Fonction utilitaire pour les headers CORS
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://davant.crm12.dynamics.com",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// ✅ Gérer les pré-requêtes OPTIONS (nécessaire pour CORS)
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
