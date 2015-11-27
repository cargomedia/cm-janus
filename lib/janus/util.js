module.exports = {
  /**
   * @returns {String}
   */
  generateTransactionId: function() {
    return Math.random().toString(36).substring(2, 12);
  }
};
