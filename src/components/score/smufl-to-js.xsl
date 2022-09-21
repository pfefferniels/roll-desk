<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:svg="http://www.w3.org/2000/svg"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    version="3.0">
    <xsl:output method="text" omit-xml-declaration="yes" indent="no"/>
    
    <xsl:template match="svg:font">
        <xsl:text>const glyphs = { </xsl:text>
        <xsl:apply-templates />
        <xsl:text>}</xsl:text>
    </xsl:template>
    
    <xsl:template match="svg:glyph">
        <xsl:value-of select="@glyph-name"/><xsl:text>: </xsl:text>
        <xsl:text>"</xsl:text>
        <xsl:value-of select="@d"/>
        <xsl:text>", </xsl:text>
    </xsl:template>
    
    <xsl:template match="metadata"/>
</xsl:stylesheet>
