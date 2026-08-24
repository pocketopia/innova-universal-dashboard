/**
 * Submission Validation Middleware
 * Validates submission data against platform taxonomies and rules
 */

const path = require('path');
const fs = require('fs');

// Load taxonomies configuration
const taxonomiesPath = path.join(__dirname, '../config/taxonomies.json');
const taxonomies = JSON.parse(fs.readFileSync(taxonomiesPath, 'utf8'));

/**
 * Get platform configuration
 */
function getPlatformConfig(platform) {
  return taxonomies.platforms[platform.toLowerCase()];
}

/**
 * Validate required fields
 */
function validateRequiredFields(data, platformConfig) {
  const errors = [];
  const requiredFields = platformConfig.requiredFields || [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`${field} is required`);
    }
  }

  return errors;
}

/**
 * Validate title
 */
function validateTitle(title) {
  const errors = [];
  const rules = taxonomies.validationRules.title;

  if (!title || typeof title !== 'string') {
    errors.push('Title is required and must be a string');
    return errors;
  }

  if (title.length < rules.minLength) {
    errors.push(`Title must be at least ${rules.minLength} characters`);
  }

  if (title.length > rules.maxLength) {
    errors.push(`Title must not exceed ${rules.maxLength} characters`);
  }

  const regex = new RegExp(rules.pattern);
  if (!regex.test(title)) {
    errors.push('Title contains invalid characters');
  }

  return errors;
}

/**
 * Validate description
 */
function validateDescription(description) {
  const errors = [];
  const rules = taxonomies.validationRules.description;

  if (!description || typeof description !== 'string') {
    errors.push('Description is required and must be a string');
    return errors;
  }

  if (description.length < rules.minLength) {
    errors.push(`Description must be at least ${rules.minLength} characters`);
  }

  if (description.length > rules.maxLength) {
    errors.push(`Description must not exceed ${rules.maxLength} characters`);
  }

  return errors;
}

/**
 * Validate category against platform taxonomy
 */
function validateCategory(category, platformConfig) {
  const errors = [];

  if (!category || typeof category !== 'string') {
    errors.push('Category is required and must be a string');
    return errors;
  }

  const validCategories = platformConfig.categories.map(c => c.id);
  if (!validCategories.includes(category.toLowerCase())) {
    errors.push(`Invalid category for ${platformConfig.name}. Valid categories: ${validCategories.join(', ')}`);
  }

  return errors;
}

/**
 * Validate genre against platform taxonomy
 */
function validateGenre(genre, platformConfig) {
  const errors = [];

  if (!genre) return errors; // Genre is typically optional

  if (typeof genre !== 'string') {
    errors.push('Genre must be a string');
    return errors;
  }

  const validGenres = platformConfig.genres || [];
  if (validGenres.length > 0 && !validGenres.includes(genre.toLowerCase())) {
    errors.push(`Invalid genre for ${platformConfig.name}. Valid genres: ${validGenres.join(', ')}`);
  }

  return errors;
}

/**
 * Validate tags
 */
function validateTags(tags) {
  const errors = [];
  const rules = taxonomies.validationRules.tags;

  if (!tags) return errors; // Tags are optional

  if (!Array.isArray(tags)) {
    // Try to parse if it's a string
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch (e) {
        errors.push('Tags must be a valid JSON array');
        return errors;
      }
    } else {
      errors.push('Tags must be an array');
      return errors;
    }
  }

  if (tags.length > rules.maxCount) {
    errors.push(`Maximum ${rules.maxCount} tags allowed`);
  }

  for (const tag of tags) {
    if (typeof tag !== 'string') {
      errors.push('Each tag must be a string');
      break;
    }
    if (tag.length < rules.minLength) {
      errors.push(`Tag "${tag}" is too short (minimum ${rules.minLength} characters)`);
    }
    if (tag.length > rules.maxLength) {
      errors.push(`Tag "${tag}" is too long (maximum ${rules.maxLength} characters)`);
    }
  }

  return errors;
}

/**
 * Validate media URLs
 */
function validateMediaUrls(mediaUrls, platformConfig) {
  const errors = [];
  const rules = taxonomies.validationRules.mediaUrl;
  const mediaRules = platformConfig.mediaTypes;

  if (!mediaUrls) {
    errors.push('Media URLs are required');
    return errors;
  }

  if (!Array.isArray(mediaUrls)) {
    errors.push('Media URLs must be an array');
    return errors;
  }

  if (mediaUrls.length === 0) {
    errors.push('At least one media URL is required');
    return errors;
  }

  if (mediaUrls.length > mediaRules.maxMediaCount) {
    errors.push(`Maximum ${mediaRules.maxMediaCount} media files allowed`);
  }

  for (let i = 0; i < mediaUrls.length; i++) {
    const url = mediaUrls[i];

    if (typeof url !== 'string') {
      errors.push(`Media URL at index ${i} must be a string`);
      continue;
    }

    // Check URL format
    try {
      const parsed = new URL(url);
      if (!rules.protocols.includes(parsed.protocol.replace(':', ''))) {
        errors.push(`Media URL at index ${i} must use HTTPS or HTTP protocol`);
      }
    } catch (e) {
      errors.push(`Media URL at index ${i} is not a valid URL`);
    }
  }

  return errors;
}

/**
 * Main validation middleware
 */
function validateSubmission(req, res, next) {
  try {
    const platform = req.params.platform?.toLowerCase();
    const data = req.body;

    // Validate platform exists
    const platformConfig = getPlatformConfig(platform);
    if (!platformConfig) {
      return res.status(400).json({
        error: 'invalid_platform',
        message: `Invalid platform: ${platform}. Valid platforms: ${Object.keys(taxonomies.platforms).join(', ')}`
      });
    }

    // Collect all validation errors
    const allErrors = [];
    const validationLog = [];

    // Validate title
    const titleErrors = validateTitle(data.title);
    if (titleErrors.length > 0) {
      allErrors.push(...titleErrors);
      validationLog.push({ type: 'title', passed: false, errors: titleErrors });
    } else {
      validationLog.push({ type: 'title', passed: true });
    }

    // Validate description
    const descriptionErrors = validateDescription(data.description);
    if (descriptionErrors.length > 0) {
      allErrors.push(...descriptionErrors);
      validationLog.push({ type: 'description', passed: false, errors: descriptionErrors });
    } else {
      validationLog.push({ type: 'description', passed: true });
    }

    // Validate category
    const categoryErrors = validateCategory(data.category, platformConfig);
    if (categoryErrors.length > 0) {
      allErrors.push(...categoryErrors);
      validationLog.push({ type: 'category', passed: false, errors: categoryErrors });
    } else {
      validationLog.push({ type: 'category', passed: true });
    }

    // Validate genre
    const genreErrors = validateGenre(data.genre, platformConfig);
    if (genreErrors.length > 0) {
      allErrors.push(...genreErrors);
      validationLog.push({ type: 'genre', passed: false, errors: genreErrors });
    } else {
      validationLog.push({ type: 'genre', passed: true });
    }

    // Validate tags
    const tagErrors = validateTags(data.tags);
    if (tagErrors.length > 0) {
      allErrors.push(...tagErrors);
      validationLog.push({ type: 'tags', passed: false, errors: tagErrors });
    } else {
      validationLog.push({ type: 'tags', passed: true });
    }

    // Validate media URLs
    const mediaErrors = validateMediaUrls(data.mediaUrls || data.media_urls, platformConfig);
    if (mediaErrors.length > 0) {
      allErrors.push(...mediaErrors);
      validationLog.push({ type: 'media_urls', passed: false, errors: mediaErrors });
    } else {
      validationLog.push({ type: 'media_urls', passed: true });
    }

    // If there are validation errors, return them
    if (allErrors.length > 0) {
      return res.status(400).json({
        error: 'validation_failed',
        message: 'Submission validation failed',
        errors: allErrors,
        validationLog,
        platform: {
          name: platformConfig.name,
          validCategories: platformConfig.categories.map(c => ({ id: c.id, name: c.name })),
          validGenres: platformConfig.genres
        }
      });
    }

    // Attach validated data and platform config to request
    req.platformConfig = platformConfig;
    req.validatedData = {
      ...data,
      platform,
      // Normalize media_urls
      media_urls: data.mediaUrls || data.media_urls,
      // Remove duplicate fields
      mediaUrls: undefined
    };
    req.validationLog = validationLog;

    next();
  } catch (error) {
    console.error('[SUBMISSION_VALIDATION] Error:', error);
    res.status(500).json({
      error: 'validation_error',
      message: 'An error occurred during validation'
    });
  }
}

/**
 * Log validation results to database
 */
function logValidation(db, submissionId, validationLog) {
  const { v4: uuidv4 } = require('uuid');
  const now = Math.floor(Date.now() / 1000);

  for (const log of validationLog) {
    const id = uuidv4();
    db.run(`
      INSERT INTO submission_validation_log (id, submission_id, validation_type, passed, errors, validated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, submissionId, log.type, log.passed ? 1 : 0, JSON.stringify(log.errors || []), now]);
  }
}

module.exports = {
  validateSubmission,
  logValidation,
  getPlatformConfig,
  taxonomies
};