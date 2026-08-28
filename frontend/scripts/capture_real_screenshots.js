import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = 'C:\\Users\\Naveen S\\.gemini\\antigravity-ide\\brain\\a8a2f493-2853-4a03-9c9c-5ee2b1372064';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function runScreenshotCapture() {
  console.log('🚀 Launching Local Edge Browser for Manual UI Testing & Screenshot Capture...');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--remote-debugging-port=9222'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  try {
    // 1. HOME LANDING PAGE
    console.log('📸 Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'screenshot_1_home_landing.png') });
    console.log('✓ Captured: screenshot_1_home_landing.png');

    // 2. STATE COMMAND & CONTROL CENTER (ADMIN DASHBOARD)
    console.log('📸 Testing State Command & Control Center...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.innerText.includes('Admin') || b.innerText.includes('Officer'));
      if (target) target.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'screenshot_2_state_command_admin.png') });
    console.log('✓ Captured: screenshot_2_state_command_admin.png');

    // 3. 10 REAL-PERSON SCENARIOS SIMULATOR
    console.log('📸 Testing 10 Real-Person Scenario Simulator...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const scenarioBtn = btns.find(b => b.innerText.includes('10 Real-Person Scenarios'));
      if (scenarioBtn) scenarioBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'screenshot_3_real_person_scenarios.png') });
    console.log('✓ Captured: screenshot_3_real_person_scenarios.png');

    // 4. MY CIVIC HUB & PROOF OF WORK
    console.log('📸 Testing My Civic Hub & Proof of Work...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const hubBtn = btns.find(b => b.innerText.includes('My Civic Hub') || b.innerText.includes('Hub'));
      if (hubBtn) hubBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'screenshot_4_my_civic_hub.png') });
    console.log('✓ Captured: screenshot_4_my_civic_hub.png');

    // 5. INTERACTIVE SATELLITE MAP
    console.log('📸 Testing Interactive Satellite Map View...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const mapBtn = btns.find(b => b.innerText.includes('Map'));
      if (mapBtn) mapBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'screenshot_5_interactive_map.png') });
    console.log('✓ Captured: screenshot_5_interactive_map.png');

    // 6. OFFICER OPERATIONAL WORKSPACE & ACTION MODALS
    console.log('📸 Testing Officer Operational Workspace & Action Modals...');
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      if (selects.length > 0) {
        selects[0].value = 'OFFICER';
        selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'screenshot_6_officer_portal.png') });
    console.log('✓ Captured: screenshot_6_officer_portal.png');

    // 7. CITIZEN COMPLAINT INTAKE STEPPER & VOICE BOX
    console.log('📸 Testing Citizen Complaint Intake Form & Voice Box...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const reportBtn = btns.find(b => b.innerText.includes('Report') || b.innerText.includes('Raise'));
      if (reportBtn) reportBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'screenshot_7_complaint_intake_stepper.png') });
    console.log('✓ Captured: screenshot_7_complaint_intake_stepper.png');

    // 8. PROOF OF WORK DETAILED SLIDER & EXIF BADGES
    console.log('📸 Testing Detailed Proof of Work Verification Panel...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const hubBtn = btns.find(b => b.innerText.includes('My Civic Hub') || b.innerText.includes('Hub'));
      if (hubBtn) hubBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const progressBtn = btns.find(b => b.innerText.includes('Progress') || b.innerText.includes('View'));
      if (progressBtn) progressBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'screenshot_8_proof_of_work_slider.png') });
    console.log('✓ Captured: screenshot_8_proof_of_work_slider.png');

    // 9. OFFLINE QUEUE & CONNECTIVITY MODAL
    console.log('📸 Testing Offline Connectivity Queue Banner & Modal...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const syncBtn = btns.find(b => b.innerText.includes('Sync') || b.innerText.includes('Offline') || b.innerText.includes('Queue'));
      if (syncBtn) syncBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'screenshot_9_offline_queue_modal.png') });
    console.log('✓ Captured: screenshot_9_offline_queue_modal.png');

  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
    console.log('🎉 Manual UI Screenshot Capture Completed Successfully!');
  }
}

runScreenshotCapture();
