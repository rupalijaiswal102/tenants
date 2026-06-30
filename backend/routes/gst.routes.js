import { Router } from 'express';

const router = Router();

// State code → State name map (from first 2 digits of GSTIN)
const STATE_CODES = {
  '01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh',
  '05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh',
  '10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur',
  '15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal',
  '20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh',
  '24':'Gujarat','26':'Dadra & Nagar Haveli','27':'Maharashtra','28':'Andhra Pradesh',
  '29':'Karnataka','30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu',
  '34':'Puducherry','35':'Andaman & Nicobar Islands','36':'Telangana',
  '37':'Andhra Pradesh (New)','38':'Ladakh','97':'Other Territory',
};

router.get('/:gstNumber', async (req, res) => {
  const { gstNumber } = req.params;

  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
  if (!gstRegex.test(gstNumber)) {
    return res.status(400).json({ error: 'Invalid GST Number format' });
  }

  const token = process.env.GST_API_KEY || process.env.SUREPASS_TOKEN || '';

  if (!token) {
    // No API key — return only state derived from GSTIN prefix
    const state = STATE_CODES[gstNumber.substring(0, 2)] || '';
    return res.json({ billingAddress: '', legalName: '', tradeName: '', state, pincode: '' });
  }

  try {
    // SurePass GST Verification API (https://app.surepass.io)
    const r = await fetch('https://api.surepass.io/api/v1/gst-verification', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_number: gstNumber }),
      signal: AbortSignal.timeout(10000),
    });

    const json = await r.json();

    if (!json.success || !json.data) {
      return res.status(404).json({ error: json.message || 'GST details not found' });
    }

    const d = json.data;

    // Build billing address from the address object
    let billingAddress = '';
    if (typeof d.address === 'string') {
      billingAddress = d.address.trim();
    } else if (d.address && typeof d.address === 'object') {
      const a = d.address;
      billingAddress = [a.door_number, a.floor_number, a.building_name, a.street, a.location, a.district]
        .filter(Boolean).join(', ');
    }

    // Combine with state and pincode if part of address string
    const state   = d.state || STATE_CODES[gstNumber.substring(0, 2)] || '';
    const pincode = d.pincode || '';

    res.json({
      billingAddress,
      legalName: d.legal_name  || '',
      tradeName: d.trade_name  || '',
      state,
      pincode,
    });
  } catch (err) {
    console.error('GST lookup error:', err.message);
    res.status(502).json({ error: 'GST lookup failed: ' + err.message });
  }
});

export default router;
