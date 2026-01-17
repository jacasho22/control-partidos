const pdf = require('pdf-parse');

async function test() {
  try {
    console.log('Testing pdf-parse v1.1.1...');
    const buffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
    
    console.log('Starting PDF parsing...');
    const data = await pdf(buffer);
    console.log('Text extracted successfully!');
    console.log('Data:', data.text);
  } catch (err) {
    console.error('FAILED isolated test v1.1.1:', err);
  }
}

test();
