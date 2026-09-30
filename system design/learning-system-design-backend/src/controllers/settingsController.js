const { prisma } = require('../config/database');

// Get all settings
exports.getAllSettings = async (req, res, next) => {
  try {
    const settings = await prisma.settings.findMany({});

    // Convert array to key-value object for easier frontend consumption
    const settingsObject = {};
    settings.forEach((setting) => {
      settingsObject[setting.key] = {
        value: setting.value,
        category: setting.category,
        description: setting.description,
      };
    });

    res.json(settingsObject);
  } catch (error) {
    next(error);
  }
};

// Get settings by category
exports.getSettingsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;

    const settings = await prisma.settings.findMany({
      where: { category },
    });

    const settingsObject = {};
    settings.forEach((setting) => {
      settingsObject[setting.key] = {
        value: setting.value,
        description: setting.description,
      };
    });

    res.json(settingsObject);
  } catch (error) {
    next(error);
  }
};

// Get single setting by key
exports.getSettingByKey = async (req, res, next) => {
  try {
    const { key } = req.params;

    const setting = await prisma.settings.findUnique({
      where: { key },
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(setting);
  } catch (error) {
    next(error);
  }
};

// Update settings (bulk update)
exports.updateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    const updates = [];
    for (const [key, value] of Object.entries(settings)) {
      // Check if setting exists
      const existing = await prisma.settings.findUnique({ where: { key } });

      if (existing) {
        const updated = await prisma.settings.update({
          where: { key },
          data: {
            value: JSON.stringify(value),
            updatedAt: new Date(),
          },
        });
        updates.push(updated);
      } else {
        // Create new setting if it doesn't exist
        const created = await prisma.settings.create({
          data: {
            key,
            value: JSON.stringify(value),
            category: 'CUSTOM',
            description: `Custom setting: ${key}`,
          },
        });
        updates.push(created);
      }
    }

    res.json({
      message: `${updates.length} settings updated successfully`,
      updated: updates,
    });
  } catch (error) {
    next(error);
  }
};

// Update single setting
exports.updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const existing = await prisma.settings.findUnique({ where: { key } });

    if (!existing) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    const updated = await prisma.settings.update({
      where: { key },
      data: {
        value: JSON.stringify(value),
        updatedAt: new Date(),
      },
    });

    res.json({
      message: 'Setting updated successfully',
      setting: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Reset settings to defaults
exports.resetSettings = async (req, res, next) => {
  try {
    const { category } = req.query;

    // Import default settings
    const mockData = require('../data/mockData');
    const defaultSettings = mockData.settings;

    let settingsToReset = defaultSettings;
    if (category) {
      settingsToReset = defaultSettings.filter(s => s.category === category);
    }

    const updates = [];
    for (const setting of settingsToReset) {
      const updated = await prisma.settings.update({
        where: { key: setting.key },
        data: {
          value: setting.value,
          updatedAt: new Date(),
        },
      });
      updates.push(updated);
    }

    res.json({
      message: `${updates.length} settings reset to defaults`,
      updated: updates,
    });
  } catch (error) {
    next(error);
  }
};

// Export settings (for backup)
exports.exportSettings = async (req, res, next) => {
  try {
    const settings = await prisma.settings.findMany({});

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      settings: settings,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=settings_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.json(exportData);
  } catch (error) {
    next(error);
  }
};

// Import settings (from backup)
exports.importSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings array is required' });
    }

    const updates = [];
    for (const setting of settings) {
      const existing = await prisma.settings.findUnique({ where: { key: setting.key } });

      if (existing) {
        const updated = await prisma.settings.update({
          where: { key: setting.key },
          data: {
            value: setting.value,
            category: setting.category,
            description: setting.description,
            updatedAt: new Date(),
          },
        });
        updates.push(updated);
      } else {
        const created = await prisma.settings.create({
          data: {
            key: setting.key,
            value: setting.value,
            category: setting.category,
            description: setting.description,
          },
        });
        updates.push(created);
      }
    }

    res.json({
      message: `${updates.length} settings imported successfully`,
      updated: updates,
    });
  } catch (error) {
    next(error);
  }
};
