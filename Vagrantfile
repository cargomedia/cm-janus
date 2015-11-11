Vagrant.configure('2') do |config|
  config.ssh.forward_agent = true
  config.vm.box = 'cargomedia/debian-7-amd64-default'

  config.vm.hostname = 'www.cm-janus.dev.cargomedia.ch'

  config.vm.network :private_network, ip: '10.10.10.15'
  config.vm.synced_folder '.', '/home/vagrant/cm-janus', :type => 'nfs'

  config.librarian_puppet.puppetfile_dir = 'puppet'
  config.librarian_puppet.placeholder_filename = '.gitkeep'
  config.librarian_puppet.resolve_options = {:force => true}

  config.vm.provision :puppet do |puppet|
    puppet.module_path = 'puppet/modules'
    puppet.manifests_path = 'puppet/manifests'
  end
end
