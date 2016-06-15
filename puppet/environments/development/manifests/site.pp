node default {
  class { 'nodejs': }

  class { 'build::gpp': }

  class { 'fluentd': }
  fluentd::config::match{ 'file':
    pattern           => '**',
    type              => 'file',
    config            => {
      path => '/tmp/fluentd-output.log',
    }
  }
}
