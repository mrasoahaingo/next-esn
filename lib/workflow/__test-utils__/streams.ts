const enc = new TextEncoder();

/**
 * Flux de test : livre `parts` une par une (comme des paquets réseau) puis se ferme, échoue
 * (erreur réseau après livraison) ou reste ouvert sans plus rien envoyer.
 */
export function testStream(
  parts: string[],
  ending: 'close' | 'error' | 'hang' = 'close',
): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < parts.length) {
        controller.enqueue(enc.encode(parts[i++]!));
        return;
      }
      if (ending === 'close') controller.close();
      else if (ending === 'error') controller.error(new TypeError('network error'));
      else return new Promise<void>(() => {});
    },
  });
}
