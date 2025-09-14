variable "project_name" {
  type        = string
  description = "Project name prefix"
  default     = "encrypted-automerge"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "ap-northeast-1"
}

variable "key_name" {
  type        = string
  description = "EC2 key pair name"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"
  default     = "t3.medium"
}

variable "arch" {
  type        = string
  description = "CPU architecture for AMI selection (x86_64 or arm64)"
  default     = "x86_64"
}

variable "allowed_cidr_ssh" {
  type        = string
  description = "CIDR block allowed for SSH"
  default     = "0.0.0.0/0"
}

variable "allowed_cidr_app" {
  type        = string
  description = "CIDR block allowed for app port"
  default     = "0.0.0.0/0"
}

variable "image_repo_url" {
  type        = string
  description = "ECR repo URL (account.dkr.ecr.region.amazonaws.com/repo)"
}

variable "image_tag" {
  type        = string
  description = "Docker image tag"
  default     = "latest"
}

variable "root_volume_size" {
  type        = number
  description = "Root EBS volume size in GiB"
  default     = 30
}

variable "root_volume_type" {
  type        = string
  description = "Root EBS volume type (gp3, gp2, etc.)"
  default     = "gp3"
}

variable "route53_zone_name" {
  type        = string
  description = "Existing Route53 public hosted zone name (e.g.bbb.xyz)"
}

variable "api_subdomain" {
  type        = string
  description = "Subdomain to use for API (e.g.aaa)"
}

