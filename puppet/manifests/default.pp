node default {
  require 'apt::source::backports'

  class {'nodejs':}
}
