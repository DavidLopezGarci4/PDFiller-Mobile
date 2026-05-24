import os
import sys

def install_and_run():
    # Intentar importar reportlab, si no está, instalarlo
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from reportlab.lib import colors
    except ImportError:
        print("Instalando ReportLab para generar el PDF de prueba...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "reportlab"])
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from reportlab.lib import colors

    # Definir la ruta del PDF
    pdf_path = os.path.join(os.path.dirname(__file__), "sample_invoice.pdf")
    
    # Crear el PDF
    c = canvas.Canvas(pdf_path, pagesize=letter)
    width, height = letter
    
    # Dibujar diseño premium (Colores Leroy-style / Marinos y grises)
    # Cabecera
    c.setFillColor(colors.HexColor("#1e293b")) # Gris pizarra oscuro
    c.rect(0, height - 120, width, 120, fill=True, stroke=False)
    
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(40, height - 60, "PDFiller 2 Corp.")
    
    c.setFont("Helvetica", 10)
    c.drawString(40, height - 85, "Soluciones Digitales de Documentación S.L.")
    c.drawString(40, height - 100, "Calle Innovación 42, Barcelona, España")
    
    # Título FACTURA
    c.setFont("Helvetica-Bold", 28)
    c.drawRightString(width - 40, height - 70, "FACTURA")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(width - 40, height - 100, "Nº: INV-2026-089")
    
    # Datos de la Factura (Sección izquierda y derecha)
    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(40, height - 170, "EMITIDO A:")
    
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(40, height - 190, "David López")
    c.setFont("Helvetica", 10)
    c.drawString(40, height - 205, "Desarrollador y Consultor Tecnológico")
    c.drawString(40, height - 220, "david.lopez@example.com")
    
    # Info de Facturación (Derecha)
    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(400, height - 170, "DETALLES DE FACTURACIÓN:")
    
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(400, height - 190, "Fecha de Emisión: 22 de Mayo, 2026")
    c.drawString(400, height - 205, "Fecha de Vencimiento: 22 de Junio, 2026")
    c.drawString(400, height - 220, "Método de Pago: Transferencia Bancaria")
    
    # Línea divisoria elegante
    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.setLineWidth(1)
    c.line(40, height - 250, width - 40, height - 250)
    
    # Tabla de Conceptos
    # Cabecera de Tabla
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.rect(40, height - 290, width - 80, 25, fill=True, stroke=False)
    
    c.setFillColor(colors.HexColor("#1e293b"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, height - 280, "DESCRIPCIÓN")
    c.drawRightString(350, height - 280, "CANTIDAD")
    c.drawRightString(450, height - 280, "PRECIO UNIT.")
    c.drawRightString(width - 50, height - 280, "TOTAL")
    
    # Línea inferior de cabecera de tabla
    c.setStrokeColor(colors.HexColor("#94a3b8"))
    c.setLineWidth(1.5)
    c.line(40, height - 290, width - 40, height - 290)
    
    # Elemento 1
    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 315, "Licencia Anual Premium - PDFiller 2 Responsive")
    c.drawRightString(350, height - 315, "1")
    c.drawRightString(450, height - 315, "1.200,00 €")
    c.drawRightString(width - 50, height - 315, "1.200,00 €")
    
    # Línea divisoria fina entre elementos
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(0.5)
    c.line(40, height - 330, width - 40, height - 330)
    
    # Elemento 2
    c.drawString(50, height - 355, "Soporte Técnico de Despliegue en Servidor Windows")
    c.drawRightString(350, height - 355, "5 horas")
    c.drawRightString(450, height - 355, "50,00 € / hr")
    c.drawRightString(width - 50, height - 355, "250,00 €")
    
    c.line(40, height - 370, width - 40, height - 370)
    
    # Totales (Alineado a la derecha)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(380, height - 410, "Subtotal:")
    c.setFont("Helvetica", 11)
    c.drawRightString(width - 50, height - 410, "1.450,00 €")
    
    c.setFont("Helvetica-Bold", 11)
    c.drawString(380, height - 430, "IVA (21%):")
    c.setFont("Helvetica", 11)
    c.drawRightString(width - 50, height - 430, "304,50 €")
    
    # Línea de Total Principal
    c.setStrokeColor(colors.HexColor("#334155"))
    c.setLineWidth(1)
    c.line(380, height - 440, width - 50, height - 440)
    
    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(colors.HexColor("#1e293b"))
    c.drawString(380, height - 460, "TOTAL DUE:")
    c.drawRightString(width - 50, height - 460, "1.754,50 €")
    
    # Notas / Términos
    c.setFillColor(colors.HexColor("#64748b"))
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(40, height - 510, "Términos y condiciones:")
    c.drawString(40, height - 525, "Por favor realice la transferencia a la cuenta bancaria ES91 2100 0412 8802 0012 3456.")
    c.drawString(40, height - 540, "El pago debe realizarse en un plazo de 30 días a partir de la fecha de emisión.")
    
    # Sección de Firma
    c.setStrokeColor(colors.HexColor("#94a3b8"))
    c.setLineWidth(1)
    c.line(40, height - 670, 220, height - 670)
    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica", 9)
    c.drawString(40, height - 685, "Firma del Cliente")
    
    c.line(380, height - 670, width - 40, height - 670)
    c.drawString(380, height - 685, "Firma de PDFiller 2 Corp.")
    
    # Guardar
    c.showPage()
    c.save()
    print(f"¡PDF de prueba generado con éxito en: {pdf_path}!")

if __name__ == "__main__":
    install_and_run()
