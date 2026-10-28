use printpdf::{Image, ImageTransform, Mm, PdfDocument};
use std::io::{BufWriter, Cursor};

const PNG_SIG: [u8; 8] = [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];

/// Returns the PNG with a single `pHYs` chunk (placed right after IHDR) for the given DPI.
pub fn png_with_dpi(bytes: &[u8], dpi: u32) -> Result<Vec<u8>, String> {
    if bytes.len() < 8 || bytes[..8] != PNG_SIG {
        return Err("not a PNG".into());
    }
    let ppm = (dpi as f64 / 0.0254).round() as u32;
    let mut phys = Vec::with_capacity(21);
    phys.extend_from_slice(&9u32.to_be_bytes());
    phys.extend_from_slice(b"pHYs");
    phys.extend_from_slice(&ppm.to_be_bytes());
    phys.extend_from_slice(&ppm.to_be_bytes());
    phys.push(1);
    let crc = crc32fast::hash(&phys[4..]);
    phys.extend_from_slice(&crc.to_be_bytes());

    let mut out = PNG_SIG.to_vec();
    let mut pos = 8;
    let mut inserted = false;
    while pos < bytes.len() {
        let hdr = bytes.get(pos..pos + 8).ok_or("truncated PNG")?;
        let len = u32::from_be_bytes(hdr[..4].try_into().unwrap()) as usize;
        let end = pos + 12 + len;
        let chunk = bytes.get(pos..end).ok_or("truncated PNG")?;
        if &hdr[4..8] != b"pHYs" {
            out.extend_from_slice(chunk);
            if &hdr[4..8] == b"IHDR" && !inserted {
                out.extend_from_slice(&phys);
                inserted = true;
            }
        }
        pos = end;
    }
    if !inserted {
        return Err("PNG has no IHDR".into());
    }
    Ok(out)
}

/// One PDF page of exactly `w_mm` x `h_mm` with the PNG embedded at 300 DPI.
pub fn build_pdf(png: &[u8], w_mm: f32, h_mm: f32) -> Result<Vec<u8>, String> {
    let (doc, page, layer) = PdfDocument::new("DVD Cover", Mm(w_mm), Mm(h_mm), "Cover");
    let decoder = printpdf::image_crate::codecs::png::PngDecoder::new(Cursor::new(png))
        .map_err(|e| e.to_string())?;
    let image = Image::try_from(decoder).map_err(|e| e.to_string())?;
    image.add_to_layer(
        doc.get_page(page).get_layer(layer),
        ImageTransform {
            dpi: Some(300.0),
            ..Default::default()
        },
    );
    let mut buf = BufWriter::new(Vec::new());
    doc.save(&mut buf).map_err(|e| e.to_string())?;
    buf.into_inner().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_png() -> Vec<u8> {
        let mut out = Vec::new();
        let mut enc = png::Encoder::new(&mut out, 4, 3);
        enc.set_color(png::ColorType::Rgb);
        enc.set_depth(png::BitDepth::Eight);
        enc.write_header().unwrap().write_image_data(&[200u8; 36]).unwrap();
        out
    }

    #[test]
    fn phys_chunk_300_dpi() {
        let out = png_with_dpi(&sample_png(), 300).unwrap();
        let mut dec = png::Decoder::new(Cursor::new(&out)).read_info().unwrap(); // verifies CRCs
        let dims = dec.info().pixel_dims.unwrap();
        assert_eq!((dims.xppu, dims.yppu), (11811, 11811));
        assert_eq!(dims.unit, png::Unit::Meter);
        let mut buf = vec![0; dec.output_buffer_size()];
        dec.next_frame(&mut buf).unwrap();
        assert_eq!(out.windows(4).filter(|w| w == b"pHYs").count(), 1);
        // idempotent: re-applying does not duplicate the chunk
        let twice = png_with_dpi(&out, 300).unwrap();
        assert_eq!(twice.windows(4).filter(|w| w == b"pHYs").count(), 1);
    }

    #[test]
    fn rejects_non_png() {
        assert!(png_with_dpi(b"hello world", 300).is_err());
    }

    #[test]
    fn pdf_mediabox() {
        let pdf = build_pdf(&sample_png(), 272.0, 183.0).unwrap();
        assert!(pdf.starts_with(b"%PDF"));
        let text = String::from_utf8_lossy(&pdf);
        let i = text.find("/MediaBox").expect("MediaBox");
        let nums: Vec<f32> = text[i..]
            .split(['[', ']'])
            .nth(1)
            .unwrap()
            .split_whitespace()
            .map(|n| n.parse().unwrap())
            .collect();
        assert!((nums[2] - 771.0).abs() <= 1.0, "{nums:?}");
        assert!((nums[3] - 518.8).abs() <= 1.0, "{nums:?}");
    }
}
