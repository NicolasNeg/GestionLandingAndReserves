/**
 * Grafo de navegación en coordenadas de mapa + A* para rutas públicas.
 */

function heuristic(nodesById, a, b) {
  const na = nodesById.get(a);
  const nb = nodesById.get(b);
  if (!na || !nb) return 0;
  return Math.hypot(nb.x - na.x, nb.y - na.y);
}

function buildAdjacencyUndirected(graph) {
  const map = new Map();
  for (const n of graph.nodes) map.set(n.id, []);
  for (const e of graph.edges) {
    const w = Math.max(0.0001, Number(e.weight) || 1);
    if (!map.has(e.from) || !map.has(e.to)) continue;
    map.get(e.from).push({ to: e.to, w });
    map.get(e.to).push({ to: e.from, w });
  }
  return map;
}

/**
 * @param {{ nodes: { id: string, x: number, y: number }[], edges: { from: string, to: string, weight?: number }[] }} graph
 * @param {string} startId
 * @param {string} goalId
 * @returns {string[] | null} Secuencia de ids de nodos incluyendo inicio y fin, o null si no hay camino.
 */
export function findNavPath(graph, startId, goalId) {
  if (!graph?.nodes?.length || !startId || !goalId || startId === goalId) {
    return startId && startId === goalId ? [startId] : null;
  }
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
  if (!nodesById.has(startId) || !nodesById.has(goalId)) return null;

  const adj = buildAdjacencyUndirected(graph);
  const open = new Set([startId]);
  const came = new Map();
  const gScore = new Map([[startId, 0]]);
  const fScore = new Map([[startId, heuristic(nodesById, startId, goalId)]]);

  while (open.size) {
    let current = null;
    let bestF = Infinity;
    for (const id of open) {
      const f = fScore.get(id) ?? Infinity;
      if (f < bestF) {
        bestF = f;
        current = id;
      }
    }
    if (!current) break;
    if (current === goalId) {
      const path = [current];
      while (came.has(path[0])) path.unshift(came.get(path[0]));
      return path;
    }
    open.delete(current);
    for (const { to, w } of adj.get(current) || []) {
      const tentative = (gScore.get(current) || 0) + w;
      if (tentative < (gScore.get(to) ?? Infinity)) {
        came.set(to, current);
        gScore.set(to, tentative);
        fScore.set(to, tentative + heuristic(nodesById, to, goalId));
        open.add(to);
      }
    }
  }
  return null;
}

/**
 * @param {{ nodes: { id: string, x: number, y: number }[] }} graph
 * @param {string[]} nodeIds
 */
export function navPathToPoints(graph, nodeIds) {
  if (!Array.isArray(nodeIds) || !nodeIds.length) return [];
  const byId = new Map((graph.nodes || []).map((n) => [n.id, n]));
  return nodeIds.map((id) => {
    const n = byId.get(id);
    return n ? { x: n.x, y: n.y } : null;
  }).filter(Boolean);
}

/**
 * @param {{ nodes: { id: string, x: number, y: number }[] }} graph
 * @param {number} mx
 * @param {number} my
 */
export function nearestNavNodeId(graph, mx, my) {
  let best = null;
  let bestD = Infinity;
  for (const n of graph.nodes || []) {
    const d = Math.hypot(n.x - mx, n.y - my);
    if (d < bestD) {
      bestD = d;
      best = n.id;
    }
  }
  return best;
}

function nodeIdExists(graph, id) {
  return !!(id && (graph.nodes || []).some((n) => n.id === id));
}

/**
 * Ruta en coordenadas de mapa desde un punto de partida (ítem "you are here" o primer nodo)
 * hasta un ítem destino, usando navGraph del documento.
 * @param {{ navGraph?: { nodes: { id: string, x: number, y: number }[], edges: { from: string, to: string, weight?: number }[] }, items?: object[] }} doc
 * @param {object | null} destinationItem
 * @returns {{ x: number, y: number }[]}
 */
export function computeRouteToMapItem(doc, destinationItem) {
  const graph = doc?.navGraph;
  if (!destinationItem || !graph?.nodes?.length || !graph?.edges?.length) return [];

  const startItem = (doc.items || []).find(
    (i) => i?.metadata?.youAreHere === true || i?.metadata?.youAreHere === 'true'
  );
  let startId = startItem?.metadata?.navNodeId != null ? String(startItem.metadata.navNodeId).trim() : '';
  if (!nodeIdExists(graph, startId)) startId = graph.nodes[0]?.id || '';
  if (!startId) return [];

  const cx = Number(destinationItem.x || 0) + Number(destinationItem.width || 0) / 2;
  const cy = Number(destinationItem.y || 0) + Number(destinationItem.height || 0) / 2;
  let goalId =
    destinationItem.metadata?.navNodeId != null ? String(destinationItem.metadata.navNodeId).trim() : '';
  if (!nodeIdExists(graph, goalId)) goalId = nearestNavNodeId(graph, cx, cy) || '';
  if (!goalId) return [];

  const ids = findNavPath(graph, startId, goalId);
  if (!ids?.length) return [];
  return navPathToPoints(graph, ids);
}
