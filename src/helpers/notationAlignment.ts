/**
 * Utility functions for improving music notation alignment in complex scenarios
 */

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface MusicalElement {
    id: string;
    bounds: BoundingBox;
    type: 'note' | 'expression' | 'beam' | 'stem';
    priority: number; // Higher priority elements are rendered on top
}

/**
 * Check if two bounding boxes overlap
 */
export function doBoxesOverlap(box1: BoundingBox, box2: BoundingBox): boolean {
    return !(
        box1.x + box1.width < box2.x ||
        box2.x + box2.width < box1.x ||
        box1.y + box1.height < box2.y ||
        box2.y + box2.height < box1.y
    );
}

/**
 * Calculate minimum spacing needed between two musical elements
 */
export function calculateMinimumSpacing(elem1: MusicalElement, elem2: MusicalElement): number {
    // Base spacing requirements
    const baseSpacing = {
        note: 2,
        expression: 1,
        beam: 0.5,
        stem: 0.2
    };

    const spacing1 = baseSpacing[elem1.type] || 1;
    const spacing2 = baseSpacing[elem2.type] || 1;
    
    return Math.max(spacing1, spacing2);
}

/**
 * Detect collisions between musical elements and suggest adjustments
 */
export function detectCollisions(elements: MusicalElement[]): Array<{
    element1: MusicalElement;
    element2: MusicalElement;
    suggestedAdjustment: { dx: number; dy: number };
}> {
    const collisions: Array<{
        element1: MusicalElement;
        element2: MusicalElement;
        suggestedAdjustment: { dx: number; dy: number };
    }> = [];

    for (let i = 0; i < elements.length; i++) {
        for (let j = i + 1; j < elements.length; j++) {
            const elem1 = elements[i];
            const elem2 = elements[j];

            if (doBoxesOverlap(elem1.bounds, elem2.bounds)) {
                const minSpacing = calculateMinimumSpacing(elem1, elem2);
                
                // Calculate suggested adjustment
                const overlapX = Math.min(elem1.bounds.x + elem1.bounds.width, elem2.bounds.x + elem2.bounds.width) -
                               Math.max(elem1.bounds.x, elem2.bounds.x);
                const overlapY = Math.min(elem1.bounds.y + elem1.bounds.height, elem2.bounds.y + elem2.bounds.height) -
                               Math.max(elem1.bounds.y, elem2.bounds.y);

                // Prefer horizontal adjustment for same-staff elements
                let dx = 0, dy = 0;
                if (Math.abs(elem1.bounds.y - elem2.bounds.y) < 5) {
                    // Same staff - adjust horizontally
                    dx = overlapX + minSpacing;
                    if (elem1.bounds.x > elem2.bounds.x) dx = -dx;
                } else {
                    // Different staffs - adjust vertically
                    dy = overlapY + minSpacing;
                    if (elem1.bounds.y > elem2.bounds.y) dy = -dy;
                }

                collisions.push({
                    element1: elem1,
                    element2: elem2,
                    suggestedAdjustment: { dx, dy }
                });
            }
        }
    }

    return collisions;
}

/**
 * Validate coordinate values and fix common issues
 */
export function validateAndFixCoordinates(coords: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}): {
    x: number;
    y: number;
    width: number;
    height: number;
    hasIssues: boolean;
} {
    let hasIssues = false;
    
    const result = {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        hasIssues: false
    };

    // Validate and fix x coordinate
    if (coords.x === undefined || !isFinite(coords.x) || isNaN(coords.x)) {
        result.x = 0;
        hasIssues = true;
    } else {
        result.x = coords.x;
    }

    // Validate and fix y coordinate
    if (coords.y === undefined || !isFinite(coords.y) || isNaN(coords.y)) {
        result.y = 0;
        hasIssues = true;
    } else {
        result.y = coords.y;
    }

    // Validate and fix width
    if (coords.width === undefined || !isFinite(coords.width) || isNaN(coords.width) || coords.width <= 0) {
        result.width = 1;
        hasIssues = true;
    } else {
        result.width = coords.width;
    }

    // Validate and fix height
    if (coords.height === undefined || !isFinite(coords.height) || isNaN(coords.height) || coords.height <= 0) {
        result.height = 1;
        hasIssues = true;
    } else {
        result.height = coords.height;
    }

    result.hasIssues = hasIssues;
    return result;
}

/**
 * Sort musical elements for optimal rendering order
 */
export function sortElementsForRendering(elements: MusicalElement[]): MusicalElement[] {
    return [...elements].sort((a, b) => {
        // Primary sort by horizontal position
        const positionDiff = a.bounds.x - b.bounds.x;
        if (Math.abs(positionDiff) > 0.001) {
            return positionDiff;
        }

        // Secondary sort by vertical position
        const verticalDiff = a.bounds.y - b.bounds.y;
        if (Math.abs(verticalDiff) > 0.001) {
            return verticalDiff;
        }

        // Tertiary sort by priority (higher priority rendered last/on top)
        return a.priority - b.priority;
    });
}

/**
 * Apply beam alignment corrections for grouped notes
 */
export function alignBeamedNotes(beamedGroup: MusicalElement[]): MusicalElement[] {
    if (beamedGroup.length < 2) return beamedGroup;

    // Sort by horizontal position
    const sorted = beamedGroup.sort((a, b) => a.bounds.x - b.bounds.x);
    
    // Calculate beam slope
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const slope = (last.bounds.y - first.bounds.y) / (last.bounds.x - first.bounds.x);
    
    // Apply alignment to intermediate notes
    return sorted.map((element, index) => {
        if (index === 0 || index === sorted.length - 1) {
            return element; // Keep first and last as anchors
        }
        
        // Calculate expected y position based on beam slope
        const expectedY = first.bounds.y + slope * (element.bounds.x - first.bounds.x);
        
        return {
            ...element,
            bounds: {
                ...element.bounds,
                y: expectedY
            }
        };
    });
}

/**
 * Advanced beam detection for complex notation scenarios
 */
export function detectBeamGroups(elements: MusicalElement[]): MusicalElement[][] {
    const noteElements = elements.filter(e => e.type === 'note');
    const groups: MusicalElement[][] = [];
    
    for (let i = 0; i < noteElements.length; i++) {
        const current = noteElements[i];
        const group = [current];
        
        // Look for nearby notes that could be beamed together
        for (let j = i + 1; j < noteElements.length; j++) {
            const candidate = noteElements[j];
            
            // Check if candidate is close enough to be in the same beam group
            const horizontalDistance = candidate.bounds.x - current.bounds.x;
            const verticalDistance = Math.abs(candidate.bounds.y - current.bounds.y);
            
            // Beam grouping criteria
            if (horizontalDistance < 100 && // Within reasonable horizontal distance
                verticalDistance < 50 && // Within same staff area
                horizontalDistance > 0) { // Ensure forward progression
                group.push(candidate);
                i = j; // Skip ahead
            } else {
                break; // End of beam group
            }
        }
        
        if (group.length > 1) {
            groups.push(group);
        }
    }
    
    return groups;
}

/**
 * Calculate alignment confidence score
 */
export function calculateAlignmentConfidence(
    sourceFeatures: any[],
    targetFeatures: any[],
    alignmentResult: { shift: number; stretch: number }
): {
    confidence: number;
    issues: string[];
    recommendations: string[];
} {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let confidence = 1.0;

    // Check feature count similarity
    const featureRatio = Math.min(sourceFeatures.length, targetFeatures.length) / 
                        Math.max(sourceFeatures.length, targetFeatures.length);
    if (featureRatio < 0.7) {
        confidence *= 0.8;
        issues.push(`Significant difference in feature count (${sourceFeatures.length} vs ${targetFeatures.length})`);
        recommendations.push('Consider manual verification of alignment results');
    }

    // Check stretch factor reasonableness
    if (alignmentResult.stretch > 1.5 || alignmentResult.stretch < 0.5) {
        confidence *= 0.6;
        issues.push(`Extreme stretch factor (${(alignmentResult.stretch * 100).toFixed(1)}%)`);
        recommendations.push('Verify source material quality and scaling');
    }

    // Check shift magnitude
    const shiftMM = Math.abs(alignmentResult.shift);
    if (shiftMM > 50) {
        confidence *= 0.7;
        issues.push(`Large shift required (${shiftMM.toFixed(1)}mm)`);
        recommendations.push('Check for systematic offset in source materials');
    }

    // Check for potential outliers
    if (confidence < 0.5) {
        recommendations.push('Consider alternative alignment approaches');
        recommendations.push('Verify input data quality');
    }

    return {
        confidence: Math.max(0, Math.min(1, confidence)),
        issues,
        recommendations
    };
}