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

  tags = {
    Name = "${var.project_name}-server"
  }
}

