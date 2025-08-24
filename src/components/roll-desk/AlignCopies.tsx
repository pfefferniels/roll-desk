import { Button, Dialog, DialogActions, DialogContent, MenuItem, Select, Stack, Typography } from "@mui/material";
import { alignFeatures, flat, RollCopy } from "linked-rolls";
import { useState } from "react";
import { calculateAlignmentConfidence } from "../../helpers/notationAlignment";

interface AlignCopiesProps {
    open: boolean
    onClose: () => void
    copy: RollCopy
    copies: RollCopy[]
    onDone: (shift: number, stretch: number) => void
}

export const AlignCopies = ({ copy, copies, onDone, onClose, open }: AlignCopiesProps) => {
    const [copyB, setCopyB] = useState<RollCopy>();
    const [alignmentError, setAlignmentError] = useState<string>();
    const [alignmentConfidence, setAlignmentConfidence] = useState<{
        confidence: number;
        issues: string[];
        recommendations: string[];
    }>();

    let shift: number | undefined, stretch: number | undefined;
    if (copyB) {
        try {
            // Enhanced alignment with validation for complex notation
            if (!copy.features || !copyB.features) {
                setAlignmentError('One or both copies have no features to align');
                setAlignmentConfidence(undefined);
            } else if (copy.features.length === 0 || copyB.features.length === 0) {
                setAlignmentError('One or both copies have empty feature sets');
                setAlignmentConfidence(undefined);
            } else {
                const align = alignFeatures(copy.features, copyB.features);
                
                // Validate alignment results
                if (!align || typeof align.shift !== 'number' || typeof align.stretch !== 'number') {
                    setAlignmentError('Alignment calculation failed - invalid results');
                    setAlignmentConfidence(undefined);
                } else if (!isFinite(align.shift) || !isFinite(align.stretch)) {
                    setAlignmentError('Alignment calculation produced non-finite values');
                    setAlignmentConfidence(undefined);
                } else if (align.stretch <= 0) {
                    setAlignmentError('Invalid stretch value - must be positive');
                    setAlignmentConfidence(undefined);
                } else if (Math.abs(align.stretch - 1) > 10) {
                    setAlignmentError('Extreme stretch value detected - may indicate alignment error');
                    setAlignmentConfidence(undefined);
                } else {
                    shift = align.shift;
                    stretch = align.stretch;
                    setAlignmentError(undefined);
                    
                    // Calculate alignment confidence
                    const confidence = calculateAlignmentConfidence(copy.features, copyB.features, align);
                    setAlignmentConfidence(confidence);
                }
            }
        } catch (error) {
            setAlignmentError(`Alignment error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setAlignmentConfidence(undefined);
            console.error('Error during feature alignment:', error);
        }
    }

    let verticalStretch: number | undefined = undefined;
    if (copy.measurements?.dimensions && copyB?.measurements?.dimensions) {
        const heightA = copy.measurements.dimensions.height;
        const heightB = copyB.measurements.dimensions.height;
        
        if (heightA && heightB && isFinite(heightA) && isFinite(heightB) && heightA > 0) {
            verticalStretch = heightB / heightA;
            
            // Validate vertical stretch
            if (!isFinite(verticalStretch) || verticalStretch <= 0) {
                console.warn('Invalid vertical stretch calculated:', verticalStretch);
                verticalStretch = undefined;
            }
        }
    }

    const handleClose = () => {
        setCopyB(undefined);
        setAlignmentError(undefined);
        setAlignmentConfidence(undefined);
        onClose();
    };

    const date = copy.productionEvent?.date && new Intl.DateTimeFormat().format(
        flat(copy.productionEvent?.date)
    );

    return (
        <Dialog open={open} onClose={handleClose} fullWidth>
            <DialogContent>
                <Stack>
                    <Typography>
                        Choose Second Copy
                    </Typography>
                    <Select value={copyB?.id || ''} onChange={(e) => {
                        const selectedCopy = copies.find(copy => copy.id === e.target.value);
                        setCopyB(selectedCopy);
                        setAlignmentError(undefined); // Clear any previous errors
                        setAlignmentConfidence(undefined); // Clear previous confidence data
                    }}>
                        {copies.map(copy => {
                            const copyDate = copy.productionEvent?.date && new Intl.DateTimeFormat().format(
                                flat(copy.productionEvent?.date)
                            );
                            return (
                                <MenuItem value={copy.id} key={`alignSymbols_${copy.id}`}>
                                    {copyDate || 'Unknown Date'} ({copy.location || 'Unknown Location'})
                                </MenuItem>
                            );
                        })}
                        <MenuItem value='' disabled>
                            None
                        </MenuItem>
                    </Select>

                    <div>
                        Shift: {shift?.toFixed(4)} mm, Stretch: {+(stretch?.toFixed(4) || 1) * 100} %
                    </div>
                    {verticalStretch && (
                        <div style={{ color: 'gray' }}>
                            Vertical Stretch: {+verticalStretch.toFixed(4) * 100} %
                        </div>
                    )}
                </Stack>
                
                {/* Enhanced alignment error display */}
                {alignmentError && (
                    <div style={{ color: 'red', marginTop: '8px', padding: '8px', border: '1px solid red', borderRadius: '4px' }}>
                        <strong>⚠️ Alignment Issue:</strong><br />
                        {alignmentError}
                    </div>
                )}

                {/* Feature count information */}
                {copyB?.features && copy.features && !alignmentError && (
                    <div style={{ color: 'gray', fontSize: '0.9em', marginTop: '8px' }}>
                        <strong>Analysis:</strong><br />
                        Features compared: {copy.features.length} ↔ {copyB.features.length}<br />
                        {stretch && (
                            <span style={{ color: stretch > 1.1 || stretch < 0.9 ? 'orange' : 'green' }}>
                                {stretch > 1.1 ? '📈 Expanding alignment' : stretch < 0.9 ? '📉 Compressing alignment' : '✅ Stable alignment'}
                            </span>
                        )}
                        
                        {/* Alignment confidence display */}
                        {alignmentConfidence && (
                            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                <strong>Confidence: {(alignmentConfidence.confidence * 100).toFixed(0)}%</strong>
                                {alignmentConfidence.confidence < 0.7 && (
                                    <span style={{ color: 'orange', marginLeft: '8px' }}>⚠️ Low confidence</span>
                                )}
                                {alignmentConfidence.issues.length > 0 && (
                                    <div style={{ marginTop: '4px', fontSize: '0.8em' }}>
                                        <strong>Issues:</strong>
                                        <ul style={{ margin: '2px 0', paddingLeft: '16px' }}>
                                            {alignmentConfidence.issues.map((issue, i) => (
                                                <li key={i}>{issue}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {alignmentConfidence.recommendations.length > 0 && (
                                    <div style={{ marginTop: '4px', fontSize: '0.8em' }}>
                                        <strong>Recommendations:</strong>
                                        <ul style={{ margin: '2px 0', paddingLeft: '16px' }}>
                                            {alignmentConfidence.recommendations.map((rec, i) => (
                                                <li key={i}>{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose}>
                    Cancel
                </Button>
                <Button
                    disabled={!shift || !stretch || !!alignmentError}
                    onClick={() => {
                        if (shift && stretch && !alignmentError) {
                            onDone(shift, stretch);
                        }
                    }}
                    variant="contained"
                    color={
                        alignmentError ? "error" : 
                        alignmentConfidence && alignmentConfidence.confidence < 0.7 ? "warning" : 
                        "primary"
                    }
                >
                    {alignmentError ? 'Cannot Apply' : 
                     alignmentConfidence && alignmentConfidence.confidence < 0.7 ? 'Apply with Caution' :
                     'Apply Alignment'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}