/*
 * Gulfpro landing page settings. This is the only file you need to edit.
 */
window.GULFPRO_CONFIG = {
  // Paste the Web app URL from Google Apps Script here (it ends in /exec).
  // While this is empty the pages run in preview mode and nothing is saved.
  formEndpoint: '',

  // "Book an appointment" button on the thank-you page.
  calendlyUrl: 'https://calendly.com/gulfpro/acc',

  // "Chat on WhatsApp" button: country code and number, digits only.
  whatsappNumber: '971555884262',

  // Contact details shown under the form and on the thank-you page.
  phones: ['+971 55 588 4262', '+971 55 516 1187'],
  email: 'info@gulfproaccountants.com',
  website: 'https://gulfproaccountants.com',

  // Optional: link to your privacy policy, shown under the Submit button.
  privacyUrl: '',

  // Optional: LinkedIn Insight Tag, to count form submissions as conversions in Campaign Manager.
  linkedinPartnerId: '',
  linkedinConversionId: '',
};
