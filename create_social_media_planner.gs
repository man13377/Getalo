/**
 * Creates a new Google Sheets file with a "Simple Social Media Content Calendar"
 * similar to the template shown in the reference video.
 */
function createSimpleSocialMediaPlanner() {
  const ss = SpreadsheetApp.create('Simple Social Media Content Calendar');
  buildSimpleSocialMediaPlanner_(ss);
  Logger.log('Planner created: %s', ss.getUrl());
  return ss.getUrl();
}

/**
 * Builds the planner in the currently active spreadsheet.
 * Warning: this resets existing tabs.
 */
function buildSimpleSocialMediaPlannerInCurrentFile() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  buildSimpleSocialMediaPlanner_(ss);
  SpreadsheetApp.getActive().toast('Planner is ready', 'Done', 5);
}

function buildSimpleSocialMediaPlanner_(ss) {
  // Reset tabs.
  const sheets = ss.getSheets();
  for (let i = sheets.length - 1; i >= 0; i--) {
    if (i === 0) {
      sheets[i].clear();
    } else {
      ss.deleteSheet(sheets[i]);
    }
  }

  const settings = ss.getSheets()[0];
  settings.setName('Settings');
  const calendar = ss.insertSheet('Content Calendar');
  const brainDump = ss.insertSheet('Idea Brain Dump');

  setupSettings_(settings);
  setupContentCalendar_(calendar, settings);
  setupIdeaBrainDump_(brainDump, settings);

  ss.setActiveSheet(calendar);
}

function setupSettings_(sheet) {
  const header = '#d7bfbe';
  const light = '#efe8e8';

  sheet.getRange('A1:H1').merge();
  sheet.getRange('A1').setValue('Settings').setFontSize(18).setFontWeight('bold');
  sheet.getRange('A2:H2').merge();
  sheet.getRange('A2').setValue('Customize dropdown labels and options here. You can keep up to 50 values per dropdown.');

  sheet.getRange('A4:C4').setValues([['Column 1 Header', 'Column 2 Header', 'Column 3 Header']]);
  sheet.getRange('A5:C5').setValues([['Content Pillar', 'Format', 'Goal']]);

  sheet.getRange('E4:E4').setValue('Checklist Labels');
  sheet.getRange('F4:F4').setValue('Status Options');

  const col1 = [
    'Entertainment',
    'Promotion',
    'Inspiration',
    'Education',
    'Community',
    'Behind the scenes'
  ];
  const col2 = ['Reel', 'Carousel', 'Post', 'Story', 'Video', 'Live'];
  const col3 = ['Likes', 'Website Visits', 'Saves', 'Email Signups', 'Comments', 'DMs'];
  const status = ['Scheduled', 'Editing', 'Posted', 'Draft', 'Recorded'];
  const checklist = ['Plan', 'Script', 'Image', 'Caption', 'Schedule', 'Post', 'Repost'];

  sheet.getRange('A7').setValue('Column 1 values');
  sheet.getRange('B7').setValue('Column 2 values');
  sheet.getRange('C7').setValue('Column 3 values');
  sheet.getRange('F7').setValue('Status values');

  writeListWithCapacity_(sheet, 'A8', col1, 50);
  writeListWithCapacity_(sheet, 'B8', col2, 50);
  writeListWithCapacity_(sheet, 'C8', col3, 50);
  writeListWithCapacity_(sheet, 'F8', status, 50);
  writeListWithCapacity_(sheet, 'E8', checklist, 7);

  sheet.getRange('A60:B60').setValues([['Theme Color', 'Hex']]);
  sheet.getRange('A61:B63').setValues([
    ['Header', '#d7bfbe'],
    ['Soft Accent', '#dcead8'],
    ['Highlight', '#f4e8bd']
  ]);

  sheet.getRange('A4:F4').setBackground(header).setFontWeight('bold');
  sheet.getRange('A7:F7').setBackground(light).setFontWeight('bold');
  sheet.getRange('A60:B60').setBackground(light).setFontWeight('bold');
  sheet.getRange('A1:H1').setBackground(header);

  sheet.setColumnWidths(1, 3, 210);
  sheet.setColumnWidth(4, 24);
  sheet.setColumnWidth(5, 180);
  sheet.setColumnWidth(6, 210);
  sheet.setColumnWidth(7, 24);
  sheet.setColumnWidth(8, 340);
  sheet.getRange('H4:H16').merge();
  sheet
    .getRange('H4')
    .setValue(
      'Tips:\n' +
        '1) Edit A5:C5 to rename the first 3 Content Calendar columns.\n' +
        '2) Edit lists in A8:C57 and F8:F57.\n' +
        '3) Duplicate "Content Calendar" when you want a fresh 150-row cycle.'
    )
    .setWrap(true)
    .setVerticalAlignment('top');

  sheet.setFrozenRows(7);
}

function setupContentCalendar_(sheet, settingsSheet) {
  const header = '#d7bfbe';
  const light = '#efe8e8';
  const green = '#dcead8';
  const yellow = '#f4e8bd';

  sheet.getRange('B2:E2').merge().setValue('March Content Plan').setFontWeight('bold').setFontSize(14);
  sheet.getRange('F2').setValue('Main Goal:').setFontStyle('italic').setHorizontalAlignment('right');
  sheet.getRange('G2:J2').merge().setValue('Become more consistent, make a plan and follow through');

  const headers = [
    '#',
    'Content Pillar',
    'Format',
    'Goal',
    'Idea',
    'Date',
    'Time',
    'Status',
    'Caption',
    'CTA',
    'Hashtags',
    'Copy/Paste',
    'Notes',
    'Custom Text 2',
    'Plan',
    'Script',
    'Image',
    'Caption',
    'Schedule',
    'Post',
    'Repost'
  ];

  sheet.getRange(4, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sheet.getRange('B4').setFormula('=Settings!A5');
  sheet.getRange('C4').setFormula('=Settings!B5');
  sheet.getRange('D4').setFormula('=Settings!C5');

  const rowCount = 150;
  const nums = Array.from({ length: rowCount }, (_, i) => [i + 1]);
  sheet.getRange(5, 1, rowCount, 1).setValues(nums);

  const sampleRows = [
    [
      'Entertainment',
      'Reel',
      'Likes',
      'A day in the life',
      new Date(2024, 2, 4),
      new Date(1899, 11, 30, 5, 0, 0),
      'Scheduled',
      'A day in the life of a small business owner is filled with emotions!',
      'Visit my youtube channel:',
      '#dayinthelife #thatgirl #productivity',
      '',
      'Find trending music',
      ''
    ],
    [
      'Promotion',
      'Carousel',
      'Website Visits',
      'New collection Haul',
      new Date(2024, 2, 5),
      new Date(1899, 11, 30, 7, 0, 0),
      'Editing',
      'Introducing our NEW COLLECTION!',
      'SHOP NOW: www.thinklikeagirlboss.com',
      '#productivity #digitalplanning',
      '',
      'Buy props',
      ''
    ],
    [
      'Inspiration',
      'Post',
      'Saves',
      'Productivity Tip',
      new Date(2024, 2, 6),
      new Date(1899, 11, 30, 7, 0, 0),
      'Scheduled',
      'Break your goals into smaller pieces. Then tackle each task. One at a time.',
      'Visit my youtube channel for more! www.youtube.com/thinklikeagirlboss',
      '#productivity #lifehack #digitalplanning',
      '',
      'Still not convinced',
      ''
    ],
    [
      'Promotion',
      'Story',
      'Website Visits',
      'Announce new video',
      new Date(2024, 2, 6),
      new Date(1899, 11, 30, 11, 0, 0),
      'Posted',
      'New HOUSE TOUR is now up!',
      'Join the List!',
      '#housetour #organizationtips #lifehack',
      '',
      'Find better audio',
      ''
    ],
    [
      'Promotion',
      'Video',
      'Website Visits',
      'New product',
      new Date(2024, 2, 6),
      new Date(1899, 11, 30, 15, 0, 0),
      'Editing',
      "You won't believe the time and effort that went into this!",
      'SHOP NOW',
      '#productivity #digitalplanning',
      '',
      'Change cover',
      ''
    ],
    [
      'Entertainment',
      'Video',
      'Likes',
      'Office Tour',
      new Date(2024, 2, 11),
      new Date(1899, 11, 30, 16, 0, 0),
      'Scheduled',
      "I wasn't always this organized, but reading Marie Kondo changed everything for me",
      'Comment 🤩 to get the link!',
      '#officetour #organizationtips #lifehack',
      '',
      'LOVE IT!',
      ''
    ],
    [
      'Promotion',
      'Story',
      'Email Signups',
      'Store Anniversary GIVEAWAY',
      new Date(2024, 2, 12),
      new Date(1899, 11, 30, 20, 0, 0),
      'Editing',
      'I want to say thanks ...',
      'Get on the list!',
      '#productivity #digitalplanning',
      '',
      'Perfect!',
      ''
    ]
  ];

  // B:N for sample rows
  sheet.getRange(5, 2, sampleRows.length, 13).setValues(sampleRows);

  // Copy/Paste column auto-join.
  sheet
    .getRange('L5')
    .setFormula(
      '=ARRAYFORMULA(IF(A5:A154="",,TRIM(I5:I154&CHAR(10)&J5:J154&CHAR(10)&K5:K154)))'
    );

  // Data validation.
  const dvPillar = SpreadsheetApp.newDataValidation()
    .requireValueInRange(settingsSheet.getRange('A8:A57'), true)
    .setAllowInvalid(false)
    .build();
  const dvFormat = SpreadsheetApp.newDataValidation()
    .requireValueInRange(settingsSheet.getRange('B8:B57'), true)
    .setAllowInvalid(false)
    .build();
  const dvGoal = SpreadsheetApp.newDataValidation()
    .requireValueInRange(settingsSheet.getRange('C8:C57'), true)
    .setAllowInvalid(false)
    .build();
  const dvStatus = SpreadsheetApp.newDataValidation()
    .requireValueInRange(settingsSheet.getRange('F8:F57'), true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange('B5:B154').setDataValidation(dvPillar);
  sheet.getRange('C5:C154').setDataValidation(dvFormat);
  sheet.getRange('D5:D154').setDataValidation(dvGoal);
  sheet.getRange('H5:H154').setDataValidation(dvStatus);
  sheet.getRange('O5:U154').insertCheckboxes();

  // Table styling.
  sheet.getRange('A4:U4').setBackground(header);
  sheet.getRange('A5:A154').setBackground('#e6d3d3');
  sheet.getRange('A5:U154').setBorder(true, true, true, true, true, true, '#e0e0e0', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange('I5:N154').setWrap(true);
  sheet.getRange('L5:L154').setWrap(true);
  sheet.getRange('F5:F154').setNumberFormat('ddd, mmm d, yyyy');
  sheet.getRange('G5:G154').setNumberFormat('h:mm AM/PM');
  sheet.getRange('N5:N154').setHorizontalAlignment('center');
  sheet.getRange('O5:U154').setHorizontalAlignment('center');
  sheet.getRange('B2:J2').setBorder(true, true, true, true, true, true, '#bdbdbd', SpreadsheetApp.BorderStyle.SOLID);

  // Conditional format for checklist checkboxes.
  const existingRules = sheet.getConditionalFormatRules();
  const ruleChecklist = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=O5=TRUE')
    .setBackground(green)
    .setRanges([sheet.getRange('O5:U154')])
    .build();
  sheet.setConditionalFormatRules(existingRules.concat([ruleChecklist]));

  // Calendar controls.
  sheet.getRange('B158:C158').merge().setValue('Set Calendar Start Date:').setFontStyle('italic').setHorizontalAlignment('right');
  sheet.getRange('D158').setValue(new Date(2024, 2, 4)).setNumberFormat('ddd, mmm d, yyyy').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('F158:G158').merge().setValue('Highlight Date:').setFontStyle('italic').setHorizontalAlignment('right');
  sheet.getRange('H158').setValue(new Date(2024, 2, 6)).setNumberFormat('ddd, mmm d, yyyy').setHorizontalAlignment('center');
  sheet.getRange('I158').insertCheckboxes().setValue(true);
  sheet.getRange('B158:I158').setBackground(light).setBorder(true, true, true, true, true, true, '#cfcfcf', SpreadsheetApp.BorderStyle.SOLID);

  const dayNames = [['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']];
  sheet.getRange('B160:H160').setValues(dayNames).setBackground(header).setFontWeight('bold').setHorizontalAlignment('center');

  const weekStartRow = 162;
  const weekCount = 12;
  for (let w = 0; w < weekCount; w++) {
    const dateRow = weekStartRow + w * 2;
    const contentRow = dateRow + 1;

    sheet.getRange(dateRow, 1, 2, 1).merge().setValue(`Week ${w + 1}`).setVerticalText(true).setHorizontalAlignment('center').setVerticalAlignment('middle').setBackground('#e2cfcf').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setRowHeight(dateRow, 28);
    sheet.setRowHeight(contentRow, 85);

    for (let d = 0; d < 7; d++) {
      const col = 2 + d;
      const colLetter = colToLetter_(col);
      const dayRef = `${colLetter}${dateRow}`;
      sheet.getRange(dateRow, col).setFormula(`=IF($D$158="","",$D$158+${w * 7 + d})`).setNumberFormat('mmmm d').setHorizontalAlignment('center').setFontWeight('bold');
      const formula =
        `=IF(${dayRef}="","",TEXTJOIN(CHAR(10),TRUE,` +
        `IFERROR(FILTER("• "&TEXT($G$5:$G$154,"hh:mm AM/PM")&" – ["&$A$5:$A$154&"] – "&$B$5:$B$154&" – "&$C$5:$C$154&" – "&$D$5:$D$154&" – "&$E$5:$E$154,$F$5:$F$154=${dayRef}),""),` +
        `IFERROR(FILTER("• "&TEXT($N$162:$N$311,"hh:mm AM/PM")&" – "&$O$162:$O$311,$M$162:$M$311=${dayRef}),"")))`;
      sheet.getRange(contentRow, col).setFormula(formula).setWrap(true).setVerticalAlignment('top');
    }
  }
  sheet.getRange(weekStartRow, 2, weekCount * 2, 7).setBorder(true, true, true, true, true, true, '#e0e0e0', SpreadsheetApp.BorderStyle.SOLID);

  // Highlight-date conditional format (date + content row).
  const rulesAfterChecklist = sheet.getConditionalFormatRules();
  const ruleHighlightDates = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($I$158=TRUE,B162=$H$158)')
    .setBackground(yellow)
    .setRanges([sheet.getRange('B162:H184')])
    .build();
  const ruleHighlightContent = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($I$158=TRUE,B162=$H$158)')
    .setBackground(yellow)
    .setRanges([sheet.getRange('B163:H185')])
    .build();
  sheet.setConditionalFormatRules(rulesAfterChecklist.concat([ruleHighlightDates, ruleHighlightContent]));

  // Other important dates table.
  sheet.getRange('L160:O160').merge().setValue('Other Important Dates').setHorizontalAlignment('center').setFontWeight('bold').setBackground(light);
  sheet.getRange('L161:O161').setValues([['#', 'Date', 'Time', 'Event']]).setBackground(header).setFontWeight('bold');
  const importantNums = Array.from({ length: 150 }, (_, i) => [i + 1]);
  sheet.getRange('L162:L311').setValues(importantNums).setBackground('#e6d3d3');
  sheet.getRange('M162:N311').setNumberFormat('ddd, mmm d, yyyy');
  sheet.getRange('N162:N311').setNumberFormat('h:mm AM/PM');

  const importantSample = [
    [new Date(2024, 2, 10), new Date(1899, 11, 30, 10, 0, 0), 'New product launch'],
    [new Date(2024, 2, 10), new Date(1899, 11, 30, 7, 0, 0), 'New video is live!'],
    [new Date(2024, 2, 10), new Date(1899, 11, 30, 9, 0, 0), 'Shop Anniversary'],
    [new Date(2024, 2, 8), new Date(1899, 11, 30, 10, 0, 0), 'New product launch'],
    [new Date(2024, 2, 9), new Date(1899, 11, 30, 7, 0, 0), 'New video is live!'],
    [new Date(2024, 2, 13), new Date(1899, 11, 30, 9, 0, 0), 'New product launch']
  ];
  sheet.getRange(162, 13, importantSample.length, 3).setValues(importantSample);
  sheet.getRange('L161:O311').setBorder(true, true, true, true, true, true, '#e0e0e0', SpreadsheetApp.BorderStyle.SOLID);

  // Specific Post View (top-right helper panel).
  sheet.getRange('W2:AC2').merge().setValue('Specific Post View').setFontWeight('bold').setHorizontalAlignment('center').setBackground(light);
  sheet.getRange('W3').setValue('Set the post #:').setFontWeight('bold');
  sheet.getRange('X3').setValue(1);
  const dvPost = SpreadsheetApp.newDataValidation().requireValueInRange(sheet.getRange('A5:A154'), true).setAllowInvalid(false).build();
  sheet.getRange('X3').setDataValidation(dvPost);

  const labels = ['Date', 'Time', 'Status', 'Content Pillar', 'Format', 'Goal'];
  sheet.getRange(5, 23, labels.length, 1).setValues(labels.map((v) => [v])).setBackground(light).setFontWeight('bold');
  const detailFormulas = [
    '=IFERROR(INDEX($F$5:$F$154,$X$3),"")',
    '=IFERROR(INDEX($G$5:$G$154,$X$3),"")',
    '=IFERROR(INDEX($H$5:$H$154,$X$3),"")',
    '=IFERROR(INDEX($B$5:$B$154,$X$3),"")',
    '=IFERROR(INDEX($C$5:$C$154,$X$3),"")',
    '=IFERROR(INDEX($D$5:$D$154,$X$3),"")'
  ];
  sheet.getRange(5, 24, detailFormulas.length, 1).setFormulas(detailFormulas.map((f) => [f]));
  sheet.getRange('X5').setNumberFormat('ddd, mmm d, yyyy');
  sheet.getRange('X6').setNumberFormat('h:mm AM/PM');

  const checklistLabels = settingsSheet.getRange('E8:E14').getValues().map((r) => r[0]).filter(String);
  sheet.getRange(12, 23, checklistLabels.length, 1).setValues(checklistLabels.map((v) => [v])).setBackground(light).setFontWeight('bold');
  const checklistCols = ['O', 'P', 'Q', 'R', 'S', 'T', 'U'];
  const checklistFormulaRows = checklistCols.map(
    (col) => `=IFERROR(IF(INDEX($${col}$5:$${col}$154,$X$3),"✓",""),"")`
  );
  sheet.getRange(12, 24, checklistFormulaRows.length, 1).setFormulas(checklistFormulaRows.map((f) => [f])).setHorizontalAlignment('center').setFontSize(14).setFontWeight('bold');

  sheet.getRange('Y5:AA5').merge().setValue('Copy/Paste').setBackground(light).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('Y6:AA9').merge().setFormula('=IFERROR(INDEX($L$5:$L$154,$X$3),"")').setWrap(true).setVerticalAlignment('top');
  sheet.getRange('Y10:AA10').merge().setValue('Caption').setBackground(light).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('Y11:AA18').merge().setFormula('=IFERROR(INDEX($I$5:$I$154,$X$3),"")').setWrap(true).setVerticalAlignment('top');

  sheet.getRange('AB5:AC5').merge().setValue('CTA').setBackground(light).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('AB6:AC8').merge().setFormula('=IFERROR(INDEX($J$5:$J$154,$X$3),"")').setWrap(true).setVerticalAlignment('top');
  sheet.getRange('AB9:AC9').merge().setValue('Hashtags').setBackground(light).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('AB10:AC12').merge().setFormula('=IFERROR(INDEX($K$5:$K$154,$X$3),"")').setWrap(true).setVerticalAlignment('top');
  sheet.getRange('AB13:AC13').merge().setValue('Notes').setBackground(light).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('AB14:AC16').merge().setFormula('=IFERROR(INDEX($M$5:$M$154,$X$3),"")').setWrap(true).setVerticalAlignment('top');
  sheet.getRange('AB17:AC17').merge().setValue('Custom Text 2').setBackground(light).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('AB18:AC21').merge().setFormula('=IFERROR(INDEX($N$5:$N$154,$X$3),"")').setWrap(true).setVerticalAlignment('top');

  sheet.getRange('W2:AC21').setBorder(true, true, true, true, true, true, '#d0d0d0', SpreadsheetApp.BorderStyle.SOLID);

  // Column widths.
  const widths = [
    50, // A
    180, // B
    150, // C
    150, // D
    280, // E
    160, // F
    100, // G
    130, // H
    300, // I
    240, // J
    230, // K
    250, // L
    220, // M
    190, // N
    58, // O
    58, // P
    58, // Q
    58, // R
    58, // S
    58, // T
    58 // U
  ];
  widths.forEach((w, idx) => sheet.setColumnWidth(idx + 1, w));
  sheet.setColumnWidth(23, 120); // W
  sheet.setColumnWidth(24, 130); // X
  sheet.setColumnWidth(25, 180); // Y
  sheet.setColumnWidth(26, 180); // Z
  sheet.setColumnWidth(27, 180); // AA
  sheet.setColumnWidth(28, 170); // AB
  sheet.setColumnWidth(29, 170); // AC

  // General styling.
  sheet.getRange('A2:AC320').setFontFamily('Poppins');
  sheet.setFrozenRows(4);
  sheet.setFrozenColumns(1);
}

function setupIdeaBrainDump_(sheet, settingsSheet) {
  const header = '#d7bfbe';
  const light = '#efe8e8';
  const green = '#dcead8';

  sheet.getRange('A1:G1').merge().setValue('Idea Brain Dump').setFontWeight('bold').setFontSize(16).setHorizontalAlignment('center').setBackground(light);
  const headers = ['#', 'Content Pillar', 'Format', 'Goal', 'Idea', 'Links to Inspo', 'Used'];
  sheet.getRange('A3:G3').setValues([headers]).setFontWeight('bold').setBackground(header);
  sheet.getRange('B3').setFormula('=Settings!A5');
  sheet.getRange('C3').setFormula('=Settings!B5');
  sheet.getRange('D3').setFormula('=Settings!C5');

  const rows = 200;
  const numbers = Array.from({ length: rows }, (_, i) => [i + 1]);
  sheet.getRange(4, 1, rows, 1).setValues(numbers);
  sheet.getRange('G4:G203').insertCheckboxes();

  const dvPillar = SpreadsheetApp.newDataValidation()
    .requireValueInRange(settingsSheet.getRange('A8:A57'), true)
    .setAllowInvalid(false)
    .build();
  const dvFormat = SpreadsheetApp.newDataValidation()
    .requireValueInRange(settingsSheet.getRange('B8:B57'), true)
    .setAllowInvalid(false)
    .build();
  const dvGoal = SpreadsheetApp.newDataValidation()
    .requireValueInRange(settingsSheet.getRange('C8:C57'), true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange('B4:B203').setDataValidation(dvPillar);
  sheet.getRange('C4:C203').setDataValidation(dvFormat);
  sheet.getRange('D4:D203').setDataValidation(dvGoal);

  const sample = [
    ['Entertainment', 'Reel', 'Likes', 'A day in the life', 'https://www.pinterest.com/', true],
    ['Promotion', 'Carousel', 'Website Visits', 'New collection Haul', 'https://www.pinterest.com/', true],
    ['Inspiration', 'Post', 'Saves', 'Productivity Tip', 'https://www.pinterest.com/', true],
    ['Promotion', 'Story', 'Website Visits', 'Announce new video', 'https://www.pinterest.com/', false],
    ['Promotion', 'Video', 'Website Visits', 'New product', 'https://www.pinterest.com/', false],
    ['Entertainment', 'Video', 'Likes', 'Office Tour', 'https://www.pinterest.com/', false],
    ['Promotion', 'Story', 'Email Signups', 'Store Anniversary GIVEAWAY', 'https://www.pinterest.com/', false]
  ];
  sheet.getRange(4, 2, sample.length, 6).setValues(sample);
  sheet.getRange('F4:F203').setWrap(true);
  sheet.getRange('E4:E203').setWrap(true);
  sheet.getRange('A4:A203').setBackground('#e6d3d3');
  sheet.getRange('A3:G203').setBorder(true, true, true, true, true, true, '#e0e0e0', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange('G4:G203').setHorizontalAlignment('center');

  const rules = sheet.getConditionalFormatRules();
  const usedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$G4=TRUE')
    .setBackground(green)
    .setRanges([sheet.getRange('A4:G203')])
    .build();
  sheet.setConditionalFormatRules(rules.concat([usedRule]));

  sheet.setColumnWidth(1, 55);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 200);
  sheet.setColumnWidth(5, 360);
  sheet.setColumnWidth(6, 260);
  sheet.setColumnWidth(7, 90);
  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(1);
  sheet.getRange('A1:G250').setFontFamily('Poppins');
}

function writeListWithCapacity_(sheet, startA1, values, capacity) {
  const [startColLetter, startRowStr] = [startA1.replace(/[0-9]/g, ''), startA1.replace(/[A-Z]/gi, '')];
  const startRow = Number(startRowStr);
  const col = colLetterToIndex_(startColLetter);
  const out = Array.from({ length: capacity }, (_, i) => [values[i] || '']);
  sheet.getRange(startRow, col, capacity, 1).setValues(out);
}

function colToLetter_(col) {
  let letter = '';
  while (col > 0) {
    const temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = (col - temp - 1) / 26;
  }
  return letter;
}

function colLetterToIndex_(colLetter) {
  let out = 0;
  const up = colLetter.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    out = out * 26 + (up.charCodeAt(i) - 64);
  }
  return out;
}
