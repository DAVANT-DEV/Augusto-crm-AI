import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildEntrepriseJSON } from "@/lib/buildEntrepriseJSON"; // ✅ ton JSON enrichi

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siret = searchParams.get("siret");

    if (!siret) {
      return NextResponse.json(
        { error: "Paramètre `siret` requis" },
        { status: 400 }
      );
    }

    // ✅ Extraire SIREN pour INPI
    const siren = siret.slice(0, 9);

    // ✅ Appels aux APIs
    const [inpiRes, pappersRes, bodaccRes] = await Promise.allSettled([
      fetch(`https://inpi-crm-project.vercel.app/api/companies?siren=${siren}`),
      fetch(`https://pappers-vercel.vercel.app/api/enrichir?siret=${siret}`),
      fetch(`https://vercel-bodacc.vercel.app/api/bodacc?id=${siret}`)
    ]);

    console.log("INPI status:", inpiRes.status);
    console.log("Pappers status:", pappersRes.status);
    console.log("BODACC status:", bodaccRes.status);

    const inpi = inpiRes.status === "fulfilled" ? await inpiRes.value.json() : null;
    const pappers = pappersRes.status === "fulfilled" ? await pappersRes.value.json() : null;
    const bodacc = bodaccRes.status === "fulfilled" ? await bodaccRes.value.json() : null;

    // ✅ Construire le JSON enrichi compact
    const entreprise = buildEntrepriseJSON(inpi, pappers, bodacc, siret);

    // 🟢 Log pour debug
    console.log("=== ENTREPRISE ENVOYÉE À GPT (compact) ===");
    console.log(JSON.stringify(entreprise, null, 2));
    console.log("==========================================");

    // ✅ Prompt avec contexte DAVANT
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

    return NextResponse.json(JSON.parse(output));
  } catch (error: any) {
    console.error("Erreur API analyseEntreprise:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
