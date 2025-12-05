import PDFDocument from "pdfkit";
import { getInvoiceDataService } from "./invoice.service.js";

export const generateInvoicePdf = async (req, res, next) => {
  try {
    const paymentId = parseInt(req.params.id);
    const payment = await getInvoiceDataService(paymentId);

    const doc = new PDFDocument({ margin: 40 });

    // HTTP headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${payment.invoiceNo}.pdf`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // ---------- HEADER ----------
    // Agar logo use karna ho:
    // doc.image("path/to/logo.png", 40, 30, { width: 80 });

    doc
      .fontSize(20)
      .text(payment.member?.branch?.name || "Gym Name", { align: "right" });
    doc
      .fontSize(10)
      .text(payment.member?.branch?.address || "Branch Address", {
        align: "right",
      });
    doc.moveDown();

    // Title
    doc
      .fontSize(18)
      .text("INVOICE", { align: "center" })
      .moveDown(1);

    // ---------- INVOICE INFO ----------
    const invoiceDate = new Date(payment.paymentDate).toLocaleDateString();

    doc
      .fontSize(11)
      .text(`Invoice No: ${payment.invoiceNo}`)
      .text(`Invoice Date: ${invoiceDate}`)
      .moveDown(1);

    // ---------- BILL TO ----------
    doc.fontSize(12).text("Bill To:", { underline: true });

    doc
      .fontSize(11)
      .text(payment.member?.fullName || "")
      .text(payment.member?.email || "")
      .text(payment.member?.phone || "")
      .moveDown(1);

    // ---------- PLAN / PAYMENT DETAILS ----------
    doc.fontSize(12).text("Plan Details:", { underline: true });

    doc
      .fontSize(11)
      .text(`Plan: ${payment.plan?.name || "N/A"}`)
      .text(`Duration: ${payment.plan?.duration || 0} days`)
      .text(`Price: ₹${payment.plan?.price?.toFixed(2) || "0.00"}`)
      .moveDown(1);

    // ---------- AMOUNT TABLE ----------
    doc.fontSize(12).text("Payment Summary:", { underline: true });

    const amount = payment.amount || 0;
    // If you want GST later, yaha tax / subtotal handle kar sakte ho
    const subtotal = amount;
    const tax = 0;
    const total = subtotal + tax;

    doc.moveDown(0.5);

    doc.fontSize(11).text(`Subtotal: ₹${subtotal.toFixed(2)}`);
    doc.text(`Tax: ₹${tax.toFixed(2)}`);
    doc.text(`Total: ₹${total.toFixed(2)}`, { underline: true });

    doc.moveDown(2);

    // ---------- FOOTER ----------
    doc
      .fontSize(10)
      .text(
        "Thank you for your payment. No refund is applicable once membership is activated.",
        { align: "center" }
      );

    doc
      .moveDown(1)
      .fontSize(9)
      .text("This is a system generated invoice.", { align: "center" });

    // End & send
    doc.end();
  } catch (err) {
    next(err);
  }
};
