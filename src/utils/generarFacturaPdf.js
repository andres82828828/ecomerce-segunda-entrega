import jsPDF from "jspdf";


 
export function descargarFacturaPDF(orden) {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.text("MEGABYTE - Factura de compra", 14, y);

  y += 10;
  doc.setFontSize(11);
  doc.text(`Factura N°: ${orden.id}`, 14, y);
  y += 6;
  doc.text(`Fecha: ${orden.fecha}`, 14, y);

  y += 10;
  doc.setFontSize(13);
  doc.text("Datos del cliente", 14, y);
  doc.setFontSize(11);
  y += 7;
  doc.text(`Nombre: ${orden.nombre}`, 14, y);
  y += 6;
  doc.text(`Correo: ${orden.email}`, 14, y);
  y += 6;
  doc.text(`Teléfono: ${orden.telefono}`, 14, y);
  y += 6;
  doc.text(`Documento: ${orden.documento}`, 14, y);
  y += 6;
  doc.text(`Dirección: ${orden.direccion}, ${orden.ciudad}`, 14, y);

  y += 10;
  doc.setFontSize(13);
  doc.text("Productos", 14, y);
  doc.setFontSize(11);
  y += 7;

  orden.items.forEach((item) => {
    doc.text(item.nombre, 14, y);
    doc.text(`$${item.precio.toLocaleString()}`, 160, y);
    y += 7;
  });

  y += 4;
  doc.setFontSize(13);
  doc.text(`Total: $${orden.total.toLocaleString()} COP`, 14, y);

  doc.save(`factura-${orden.id}.pdf`);
}