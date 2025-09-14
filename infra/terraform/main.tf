terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

############################
# ECR: 既存リポジトリを前提（ecr_build_push.shで作成済み）
# Terraformでは作成しない
############################

############################
# IAM for EC2
############################
resource "aws_iam_role" "ec2_role" {
  name               = "${var.project_name}-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecr_readonly" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

############################
# Security Group
############################
resource "aws_security_group" "server_sg" {
  name_prefix = "${var.project_name}-sg-"
  description = "Security group for ${var.project_name}"
  vpc_id      = data.aws_vpc.default.id

  lifecycle {
    create_before_destroy = true
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr_ssh]
  }

  ingress {
    description = "App port"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr_app]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

############################
# ALB Security Group
############################
resource "aws_security_group" "alb_sg" {
  name_prefix = "${var.project_name}-alb-sg-"
  description = "ALB SG for ${var.project_name}"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

############################
# Target Group and ALB
############################
resource "aws_lb_target_group" "api_tg" {
  name     = "${var.project_name}-tg"
  port     = 3001
  protocol = "HTTP"
  vpc_id   = data.aws_vpc.default.id
  health_check {
    path                = "/test"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb" "api_alb" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = data.aws_subnets.default.ids
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.api_alb.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.api_alb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate_validation.api.certificate_arn
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_tg.arn
  }
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

############################
# Route53 Hosted Zone (existing) & ACM
############################
data "aws_route53_zone" "zone" {
  name         = var.route53_zone_name
  private_zone = false
}

locals {
  api_domain_name = "${var.api_subdomain}.${var.route53_zone_name}"
}

resource "aws_acm_certificate" "api" {
  domain_name       = local.api_domain_name
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }
  tags = { Name = "${var.project_name}-api-cert" }
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = { for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
    name   = dvo.resource_record_name
    type   = dvo.resource_record_type
    record = dvo.resource_record_value
  } }
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for r in aws_route53_record.api_cert_validation : r.fqdn]
}

############################
# AMI & EC2
############################
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["137112412989"] # Amazon Linux 2023 owner
  filter {
    name   = "name"
    values = ["al2023-ami-*-${var.arch}"]
  }
}

locals {
  user_data = <<-EOT
    #!/bin/bash
    set -euo pipefail
    AMAZON_LINUX=$(cat /etc/os-release | grep -i "Amazon Linux" || true)
    if [ -n "$AMAZON_LINUX" ]; then
      dnf update -y || true
      dnf install -y docker awscli || true
      systemctl enable docker
      systemctl start docker
    else
      yum update -y || true
      yum install -y docker awscli || true
      systemctl enable docker
      systemctl start docker
    fi

    REGION=${var.aws_region}
    REPO_URL=${var.image_repo_url}
    IMAGE_TAG=${var.image_tag}
    IMAGE_URI="$REPO_URL:$IMAGE_TAG"

    # Extract registry host (account.dkr.ecr.region.amazonaws.com)
    REGISTRY_HOST=$(echo "$REPO_URL" | awk -F'/' '{print $1}')
    # Wait for docker to be fully up
    sleep 3 || true
    docker info >/dev/null 2>&1 || true
    aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY_HOST"

    docker ps -a --format '{{.Names}}' | grep -w ${var.project_name} && docker rm -f ${var.project_name} || true
    docker pull "$IMAGE_URI"
    docker run -d --restart always --name ${var.project_name} -p 3001:3001 "$IMAGE_URI"
  EOT
}

resource "aws_instance" "server" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.server_sg.id]
  key_name                    = var.key_name
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name
  associate_public_ip_address = true
  user_data                   = local.user_data

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = var.root_volume_type
    encrypted   = true
  }

  tags = {
    Name = "${var.project_name}-server"
  }
}

############################
# Attach instance to Target Group
############################
resource "aws_lb_target_group_attachment" "server_attachment" {
  target_group_arn = aws_lb_target_group.api_tg.arn
  target_id        = aws_instance.server.id
  port             = 3001
}

############################
# Route53 alias to ALB
############################
resource "aws_route53_record" "api_alias" {
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = local.api_domain_name
  type    = "A"
  alias {
    name                   = aws_lb.api_alb.dns_name
    zone_id                = aws_lb.api_alb.zone_id
    evaluate_target_health = false
  }
}

