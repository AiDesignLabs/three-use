import type * as THREE from 'three'
import { HalfEdgeMap } from 'three-bvh-csg'

/** Edge descriptor: [faceIndex, edgeIndex] */
export type EdgeDescriptor = [number, number]

/** Vertex index */
export type VertexIndex = number

/** Face index */
export type FaceIndex = number

/** Half-edge topology interface providing all topology query methods */
export interface HalfEdgeTopology {
  // Vertex-related queries
  /** Get all neighboring vertices of a given vertex */
  getVertexNeighbors: (vertexIndex: number) => number[]
  /** Get all faces incident to a given vertex */
  getVertexIncidentFaces: (vertexIndex: number) => number[]
  /** Get all edges incident to a given vertex */
  getVertexIncidentEdges: (vertexIndex: number) => EdgeDescriptor[]
  /** Get the valence (degree) of a vertex */
  getVertexValence: (vertexIndex: number) => number

  // Face-related queries
  /** Get neighboring faces of a given face */
  getFaceNeighbors: (faceIndex: number) => number[]
  /** Get vertices of a given face */
  getFaceVertices: (faceIndex: number) => [number, number, number]
  /** Get edges of a given face */
  getFaceEdges: (faceIndex: number) => EdgeDescriptor[]
  /** Check if a face is on the boundary */
  isFaceOnBoundary: (faceIndex: number) => boolean

  // Edge-related queries
  /** Get the faces adjacent to an edge */
  getEdgeFaces: (faceIndex: number, edgeIndex: number) => number[]
  /** Get the vertices of an edge */
  getEdgeVertices: (faceIndex: number, edgeIndex: number) => [number, number]
  /** Get the opposite half-edge */
  getOppositeHalfEdge: (faceIndex: number, edgeIndex: number) => EdgeDescriptor | null
  /** Check if an edge is on the boundary */
  isEdgeOnBoundary: (faceIndex: number, edgeIndex: number) => boolean

  // Traversal operations
  /** Walk around a vertex, collecting incident faces in order */
  walkAroundVertex: (vertexIndex: number, startFaceIndex?: number) => number[]
  /** Walk around a face, getting adjacent faces in order */
  walkAroundFace: (faceIndex: number) => (number | null)[]
  /** Find shortest path between two vertices */
  findShortestPath: (startVertex: number, endVertex: number) => number[] | null

  // Utility methods
  /** Get total number of vertices */
  getVertexCount: () => number
  /** Get total number of faces */
  getFaceCount: () => number
  /** Get the underlying geometry */
  getGeometry: () => THREE.BufferGeometry
  /** Update the half-edge structure from geometry */
  update: () => void
}

/**
 * Create a half-edge topology object from a Three.js BufferGeometry
 * @param geometry - The geometry to create half-edge structure from
 * @returns HalfEdgeTopology object with all query methods
 */
export function createHalfEdgeTopology(geometry: THREE.BufferGeometry): HalfEdgeTopology {
  const halfEdgeMap = new HalfEdgeMap()
  let vertices = geometry.attributes.position.array as Float32Array
  let indices = geometry.index ? geometry.index.array as Uint32Array : null

  // Build half-edge structure
  halfEdgeMap.updateFrom(geometry)

  // ==============================================
  // Basic utility methods (no dependencies)
  // ==============================================

  /**
   * Get the total number of vertices
   */
  const getVertexCount = (): number => {
    return vertices.length / 3
  }

  /**
   * Get the total number of faces
   */
  const getFaceCount = (): number => {
    return indices ? indices.length / 3 : vertices.length / 9
  }

  /**
   * Get the underlying geometry
   */
  const getGeometry = (): THREE.BufferGeometry => {
    return geometry
  }

  /**
   * Update the half-edge structure from the geometry
   * Call this after modifying the geometry
   */
  const update = (): void => {
    vertices = geometry.attributes.position.array as Float32Array
    indices = geometry.index ? geometry.index.array as Uint32Array : null
    halfEdgeMap.updateFrom(geometry)
  }

  // ==============================================
  // Basic face queries (minimal dependencies)
  // ==============================================

  /**
   * Get vertices of a given face
   * @param faceIndex - Index of the face
   * @returns Array of vertex indices [v0, v1, v2]
   */
  const getFaceVertices = (faceIndex: number): [number, number, number] => {
    if (!indices) {
      // Non-indexed geometry
      return [
        faceIndex * 3,
        faceIndex * 3 + 1,
        faceIndex * 3 + 2,
      ]
    }
    else {
      // Indexed geometry
      return [
        indices[faceIndex * 3],
        indices[faceIndex * 3 + 1],
        indices[faceIndex * 3 + 2],
      ]
    }
  }

  /**
   * Get neighboring faces of a given face
   * @param faceIndex - Index of the face
   * @returns Array of neighboring face indices
   */
  const getFaceNeighbors = (faceIndex: number): number[] => {
    const neighbors: number[] = []

    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex++) {
      const siblingFace = halfEdgeMap.getSiblingTriangleIndex(faceIndex, edgeIndex)
      if (siblingFace !== -1) {
        neighbors.push(siblingFace)
      }
    }

    return neighbors
  }

  /**
   * Get edges of a given face
   * @param faceIndex - Index of the face
   * @returns Array of edge descriptors [faceIndex, edgeIndex]
   */
  const getFaceEdges = (faceIndex: number): EdgeDescriptor[] => {
    return [
      [faceIndex, 0],
      [faceIndex, 1],
      [faceIndex, 2],
    ]
  }

  /**
   * Check if a face is on the boundary (has at least one boundary edge)
   * @param faceIndex - Index of the face
   * @returns True if the face is on the boundary
   */
  const isFaceOnBoundary = (faceIndex: number): boolean => {
    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex++) {
      if (halfEdgeMap.getSiblingTriangleIndex(faceIndex, edgeIndex) === -1) {
        return true
      }
    }
    return false
  }

  /**
   * Walk around a face, getting adjacent faces in order
   * @param faceIndex - Index of the face
   * @returns Array of adjacent face indices [neighbor0, neighbor1, neighbor2]
   */
  const walkAroundFace = (faceIndex: number): (number | null)[] => {
    const neighbors: (number | null)[] = []

    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex++) {
      const neighbor = halfEdgeMap.getSiblingTriangleIndex(faceIndex, edgeIndex)
      neighbors.push(neighbor !== -1 ? neighbor : null)
    }

    return neighbors
  }

  // ==============================================
  // Edge-related queries
  // ==============================================

  /**
   * Get the two faces adjacent to an edge
   * @param faceIndex - Index of the face containing the edge
   * @param edgeIndex - Index of the edge within the face (0, 1, or 2)
   * @returns Array of face indices [face1, face2] or [face1] for boundary edges
   */
  const getEdgeFaces = (faceIndex: number, edgeIndex: number): number[] => {
    const faces = [faceIndex]
    const siblingFace = halfEdgeMap.getSiblingTriangleIndex(faceIndex, edgeIndex)
    if (siblingFace !== -1) {
      faces.push(siblingFace)
    }
    return faces
  }

  /**
   * Get the two vertices of an edge
   * @param faceIndex - Index of the face containing the edge
   * @param edgeIndex - Index of the edge within the face (0, 1, or 2)
   * @returns Array of vertex indices [v1, v2]
   */
  const getEdgeVertices = (faceIndex: number, edgeIndex: number): [number, number] => {
    const faceVertices = getFaceVertices(faceIndex)
    return [
      faceVertices[edgeIndex],
      faceVertices[(edgeIndex + 1) % 3],
    ]
  }

  /**
   * Get the opposite half-edge
   * @param faceIndex - Index of the face containing the edge
   * @param edgeIndex - Index of the edge within the face (0, 1, or 2)
   * @returns Opposite half-edge [faceIndex, edgeIndex] or null for boundary edges
   */
  const getOppositeHalfEdge = (faceIndex: number, edgeIndex: number): EdgeDescriptor | null => {
    const siblingFace = halfEdgeMap.getSiblingTriangleIndex(faceIndex, edgeIndex)
    const siblingEdge = halfEdgeMap.getSiblingEdgeIndex(faceIndex, edgeIndex)

    if (siblingFace !== -1 && siblingEdge !== -1) {
      return [siblingFace, siblingEdge]
    }

    return null
  }

  /**
   * Check if an edge is on the boundary
   * @param faceIndex - Index of the face containing the edge
   * @param edgeIndex - Index of the edge within the face (0, 1, or 2)
   * @returns True if the edge is on the boundary
   */
  const isEdgeOnBoundary = (faceIndex: number, edgeIndex: number): boolean => {
    return halfEdgeMap.getSiblingTriangleIndex(faceIndex, edgeIndex) === -1
  }

  // ==============================================
  // Vertex-related queries (depend on face queries)
  // ==============================================

  /**
   * Get all faces incident to a given vertex
   * @param vertexIndex - Index of the vertex
   * @returns Array of face indices
   */
  const getVertexIncidentFaces = (vertexIndex: number): number[] => {
    const faces: number[] = []

    if (!indices) {
      // Non-indexed geometry
      for (let i = 0; i < vertices.length / 9; i++) {
        const faceVertices = getFaceVertices(i)
        if (faceVertices.includes(vertexIndex)) {
          faces.push(i)
        }
      }
    }
    else {
      // Indexed geometry
      for (let i = 0; i < indices.length / 3; i++) {
        const faceVertices = getFaceVertices(i)
        if (faceVertices.includes(vertexIndex)) {
          faces.push(i)
        }
      }
    }

    return faces
  }

  /**
   * Get all neighboring vertices of a given vertex
   * @param vertexIndex - Index of the vertex
   * @returns Array of neighboring vertex indices
   */
  const getVertexNeighbors = (vertexIndex: number): number[] => {
    const neighbors = new Set<number>()
    const incidentFaces = getVertexIncidentFaces(vertexIndex)

    for (const faceIndex of incidentFaces) {
      const faceVertices = getFaceVertices(faceIndex)
      const vertexPos = faceVertices.indexOf(vertexIndex)

      if (vertexPos !== -1) {
        // Add the other two vertices of the triangle
        for (let i = 0; i < 3; i++) {
          if (i !== vertexPos) {
            neighbors.add(faceVertices[i])
          }
        }
      }
    }

    return Array.from(neighbors)
  }

  /**
   * Get all edges incident to a given vertex
   * @param vertexIndex - Index of the vertex
   * @returns Array of edge descriptors [faceIndex, edgeIndex]
   */
  const getVertexIncidentEdges = (vertexIndex: number): EdgeDescriptor[] => {
    const edges: EdgeDescriptor[] = []
    const incidentFaces = getVertexIncidentFaces(vertexIndex)

    for (const faceIndex of incidentFaces) {
      const faceVertices = getFaceVertices(faceIndex)
      const vertexPos = faceVertices.indexOf(vertexIndex)

      if (vertexPos !== -1) {
        // Add edges connected to this vertex
        edges.push([faceIndex, vertexPos])
        edges.push([faceIndex, (vertexPos + 2) % 3])
      }
    }

    return edges
  }

  /**
   * Get the valence (degree) of a vertex
   * @param vertexIndex - Index of the vertex
   * @returns Number of edges connected to the vertex
   */
  const getVertexValence = (vertexIndex: number): number => {
    return getVertexNeighbors(vertexIndex).length
  }

  // ==============================================
  // Advanced traversal operations (depend on other functions)
  // ==============================================

  /**
   * Walk around a vertex, collecting all incident faces in order
   * @param vertexIndex - Index of the vertex
   * @param startFaceIndex - Optional starting face index
   * @returns Array of face indices in order around the vertex
   */
  const walkAroundVertex = (vertexIndex: number, startFaceIndex?: number): number[] => {
    const incidentFaces = getVertexIncidentFaces(vertexIndex)

    if (incidentFaces.length === 0) {
      return []
    }

    const startFace = startFaceIndex ?? incidentFaces[0]
    const visited = new Set<number>()
    const orderedFaces: number[] = []

    let currentFace = startFace

    while (!visited.has(currentFace)) {
      visited.add(currentFace)
      orderedFaces.push(currentFace)

      // Find next face around the vertex
      const faceVertices = getFaceVertices(currentFace)
      const vertexPos = faceVertices.indexOf(vertexIndex)

      if (vertexPos !== -1) {
        // Try to get the next face by following the edge
        const nextEdge = (vertexPos + 2) % 3
        const nextFace = halfEdgeMap.getSiblingTriangleIndex(currentFace, nextEdge)

        if (nextFace !== -1 && incidentFaces.includes(nextFace) && !visited.has(nextFace)) {
          currentFace = nextFace
        }
        else {
          break
        }
      }
      else {
        break
      }
    }

    return orderedFaces
  }

  /**
   * Find a simple path between two vertices using breadth-first search
   * @param startVertex - Starting vertex index
   * @param endVertex - Target vertex index
   * @returns Array of vertex indices representing the path, or null if no path exists
   */
  const findShortestPath = (startVertex: number, endVertex: number): number[] | null => {
    if (startVertex === endVertex) {
      return [startVertex]
    }

    const visited = new Set<number>()
    const queue: Array<{ vertex: number, path: number[] }> = [
      { vertex: startVertex, path: [startVertex] },
    ]

    while (queue.length > 0) {
      const { vertex, path } = queue.shift()!

      if (visited.has(vertex)) {
        continue
      }

      visited.add(vertex)

      if (vertex === endVertex) {
        return path
      }

      const neighbors = getVertexNeighbors(vertex)
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({
            vertex: neighbor,
            path: [...path, neighbor],
          })
        }
      }
    }

    return null
  }

  // Return the topology interface
  return {
    // Vertex-related queries
    getVertexNeighbors,
    getVertexIncidentFaces,
    getVertexIncidentEdges,
    getVertexValence,

    // Face-related queries
    getFaceNeighbors,
    getFaceVertices,
    getFaceEdges,
    isFaceOnBoundary,

    // Edge-related queries
    getEdgeFaces,
    getEdgeVertices,
    getOppositeHalfEdge,
    isEdgeOnBoundary,

    // Traversal operations
    walkAroundVertex,
    walkAroundFace,
    findShortestPath,

    // Utility methods
    getVertexCount,
    getFaceCount,
    getGeometry,
    update,
  }
}
