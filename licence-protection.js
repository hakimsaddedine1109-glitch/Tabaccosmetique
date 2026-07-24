// =========================================================
// Protection licence : essai gratuit + activation signée (ECDSA)
// + horloge anti-triche (empêche de reculer la date du téléphone)
// 100% hors-ligne après activation. Aucun serveur, aucune base de données.
// À coller dans le <script> principal de index.html, AVANT le code
// qui initialise l'écran d'accueil de l'application.
// =========================================================

// Colle ici la clé publique JSON affichée par generateur-licence.html
const CLE_PUBLIQUE_JWK = {
  "kty": "EC", "crv": "P-256", "x": "REMPLACE_MOI", "y": "REMPLACE_MOI"
};

const DUREE_ESSAI_JOURS = 10;

const CLE_ID_APPAREIL = '__bt_device_id';
const CLE_PREMIER_LANCEMENT = '__bt_first_launch';
const CLE_LICENCE = '__bt_license_code';
const CLE_TEMPS_MAX_VU = '__bt_temps_max_vu';

// --- Horloge anti-triche ---
// Ne renvoie jamais une date plus ancienne que la dernière vue :
// si l'utilisateur recule l'horloge du téléphone, on l'ignore.

function tempsActuelFiable() {
  const maintenant = Date.now();
  const maxVu = parseInt(localStorage.getItem(CLE_TEMPS_MAX_VU) || '0', 10);
  const tempsFiable = Math.max(maintenant, maxVu);
  localStorage.setItem(CLE_TEMPS_MAX_VU, String(tempsFiable));
  return tempsFiable;
}

// --- Identité de l'appareil et de l'installation ---

function obtenirIdAppareil() {
  let id = localStorage.getItem(CLE_ID_APPAREIL);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLE_ID_APPAREIL, id);
  }
  return id;
}

function obtenirPremierLancement() {
  let horodatage = localStorage.getItem(CLE_PREMIER_LANCEMENT);
  if (!horodatage) {
    horodatage = String(tempsActuelFiable());
    localStorage.setItem(CLE_PREMIER_LANCEMENT, horodatage);
  }
  return parseInt(horodatage, 10);
}

function joursDepuisPremierLancement() {
  const premier = obtenirPremierLancement();
  return (tempsActuelFiable() - premier) / 86400000;
}

// --- Utilitaires d'encodage ---

function base64UrlVersOctets(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// --- Vérification d'un code de licence ---

async function verifierCodeLicence(code) {
  try {
    const [payloadB64, sigB64] = code.trim().split('.');
    if (!payloadB64 || !sigB64) return { valide: false, raison: 'format' };

    const payloadOctets = base64UrlVersOctets(payloadB64);
    const payloadJson = new TextDecoder().decode(payloadOctets);
    const payload = JSON.parse(payloadJson);
    const signature = base64UrlVersOctets(sigB64);

    const clePublique = await crypto.subtle.importKey(
      'jwk', CLE_PUBLIQUE_JWK, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
    );

    const valideCrypto = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      clePublique,
      signature,
      payloadOctets
    );

    if (!valideCrypto) return { valide: false, raison: 'signature' };
    if (payload.appareil !== obtenirIdAppareil()) return { valide: false, raison: 'appareil' };
    if (payload.expire && new Date(payload.expire).getTime() < tempsActuelFiable()) {
      return { valide: false, raison: 'expire' };
    }

    return { valide: true, payload };
  } catch (e) {
    return { valide: false, raison: 'erreur' };
  }
}

async function activerLicence(code) {
  const resultat = await verifierCodeLicence(code);
  if (resultat.valide) {
    localStorage.setItem(CLE_LICENCE, code.trim());
    return true;
  }
  return false;
}

// --- Décision d'accès à appeler au démarrage de l'app ---

async function verifierAccesApplication() {
  const codeEnregistre = localStorage.getItem(CLE_LICENCE);
  if (codeEnregistre) {
    const resultat = await verifierCodeLicence(codeEnregistre);
    if (resultat.valide) {
      return { acces: true, mode: 'licence', payload: resultat.payload };
    }
    // code enregistré mais devenu invalide (ex: expiré) -> on le retire
    localStorage.removeItem(CLE_LICENCE);
  }

  const jours = joursDepuisPremierLancement();
  if (jours < DUREE_ESSAI_JOURS) {
    return { acces: true, mode: 'essai', joursRestants: Math.ceil(DUREE_ESSAI_JOURS - jours) };
  }

  return { acces: false, idAppareil: obtenirIdAppareil() };
}
